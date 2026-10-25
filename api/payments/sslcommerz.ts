import { Hono, type Context } from "hono";
import { and, eq } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "../queries/connection";
import {
  parseBDTToPaisa,
  sslcommerzService,
  type SSLCommerzValidation,
} from "./sslcommerz.service";

export const sslcommerzApp = new Hono();

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function processVerifiedPayment(valId: string, tranId: string) {
  if (!valId || !tranId || tranId.length > 100) {
    return { success: false as const, reason: "missing_transaction_reference" };
  }

  const db = getDb();
  const [payment] = await db
    .select()
    .from(schema.subscriptionPayments)
    .where(eq(schema.subscriptionPayments.tranId, tranId))
    .limit(1);

  if (!payment) return { success: false as const, reason: "unknown_transaction" };
  if (payment.currency !== "BDT") {
    return { success: false as const, reason: "currency_mismatch" };
  }
  if (payment.status === "VALIDATED") {
    return { success: true as const, alreadyProcessed: true };
  }
  if (payment.status !== "INITIATED") {
    return { success: false as const, reason: "payment_not_pending" };
  }

  const validation = await sslcommerzService.validateTransaction(valId);
  const response = validation as SSLCommerzValidation;
  const statusValid = response.status === "VALID" || response.status === "VALIDATED";
  const transactionMatches = asString(response.tran_id) === tranId;
  const validationIdMatches = !response.val_id || asString(response.val_id) === valId;
  const currencyMatches = asString(response.currency).toUpperCase() === "BDT";
  let amountMatches = false;
  try {
    amountMatches =
      parseBDTToPaisa(asString(response.amount)) === payment.amountCents;
  } catch {
    amountMatches = false;
  }

  if (!statusValid || !transactionMatches || !validationIdMatches || !currencyMatches || !amountMatches) {
    // Do not let an unauthenticated browser callback permanently fail a valid
    // attempt. Keep it pending so a genuine IPN/success callback can be retried.
    return { success: false as const, reason: "gateway_validation_failed" };
  }

  // Conditional claim prevents duplicate/concurrent callbacks from extending a period twice.
  // The claim and subscription extension are in one transaction; a failure rolls both back.
  await db.transaction(async (tx) => {
    const claimed = await tx
      .update(schema.subscriptionPayments)
      .set({
        status: "VALIDATED",
        valId,
        gatewayRawResponse: JSON.stringify(response).slice(0, 60000),
        paidAt: new Date(),
      })
      .where(
        and(
          eq(schema.subscriptionPayments.id, payment.id),
          eq(schema.subscriptionPayments.status, "INITIATED"),
        ),
      );

    const affectedRows = Number((claimed as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0);
    if (affectedRows !== 1) return;

    const [subscription] = await tx
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.id, payment.subscriptionId))
      .limit(1);

    if (!subscription) throw new Error("Subscription record missing for verified payment");

    const now = new Date();
    const currentEnd = new Date(subscription.currentPeriodEnd);
    const periodStart = currentEnd > now ? currentEnd : now;
    const periodEnd = new Date(periodStart.getTime() + payment.months * 30 * 24 * 60 * 60 * 1000);

    await tx
      .update(schema.subscriptions)
      .set({
        ...(payment.planId ? { plan: payment.planId as "starter" | "pro" | "business" } : {}),
        monthlyCents: Math.round(payment.amountCents / payment.months),
        status: "active",
        currentPeriodEnd: periodEnd,
      })
      .where(eq(schema.subscriptions.id, subscription.id));
  });

  const [after] = await db
    .select({ status: schema.subscriptionPayments.status })
    .from(schema.subscriptionPayments)
    .where(eq(schema.subscriptionPayments.id, payment.id))
    .limit(1);

  return { success: after?.status === "VALIDATED" };
}

async function handleSuccess(c: Context) {
  try {
    const body = await c.req.parseBody();
    const result = await processVerifiedPayment(asString(body.val_id), asString(body.tran_id));
    const frontend = process.env.FRONTEND_URL || "/";
    const status = result.success ? "success" : "failed";
    const url = new URL("/dashboard/billing", frontend.startsWith("http") ? frontend : "https://invalid.local");
    url.searchParams.set("payment", status);
    if (result.success && "tran_id" in body) url.searchParams.set("tran_id", asString(body.tran_id));
    return c.redirect(frontend.startsWith("http") ? url.toString() : `/dashboard/billing?payment=${status}`);
  } catch {
    const frontend = process.env.FRONTEND_URL || "/";
    return c.redirect(frontend.startsWith("http") ? `${frontend.replace(/\/+$/, "")}/dashboard/billing?payment=error` : "/dashboard/billing?payment=error");
  }
}

sslcommerzApp.post("/success", handleSuccess);

sslcommerzApp.post("/ipn", async (c) => {
  try {
    const body = await c.req.parseBody();
    const valId = asString(body.val_id);
    const tranId = asString(body.tran_id);
    if (!valId || !tranId) return c.text("Missing transaction reference", 400);

    // Never trust IPN status by itself. The shared processor calls the validation API.
    const result = await processVerifiedPayment(valId, tranId);
    if (!result.success && result.reason === "unknown_transaction") {
      return c.text("Unknown transaction", 404);
    }
    return c.text("IPN processed", 200);
  } catch {
    return c.text("IPN processing failed; retry later", 500);
  }
});

sslcommerzApp.post("/fail", (c) => {
  const frontend = process.env.FRONTEND_URL || "/";
  return c.redirect(frontend.startsWith("http") ? `${frontend.replace(/\/+$/, "")}/dashboard/billing?payment=failed` : "/dashboard/billing?payment=failed");
});

sslcommerzApp.post("/cancel", (c) => {
  const frontend = process.env.FRONTEND_URL || "/";
  return c.redirect(frontend.startsWith("http") ? `${frontend.replace(/\/+$/, "")}/dashboard/billing?payment=cancelled` : "/dashboard/billing?payment=cancelled");
});
