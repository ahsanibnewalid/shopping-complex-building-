import { URLSearchParams } from "node:url";

export interface InitPaymentInput {
  tranId: string;
  amountInPaisa: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;
}

export interface SSLCommerzValidation {
  status?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency?: string;
  currency_type?: string;
  store_id?: string;
  bank_tran_id?: string;
  card_type?: string;
  risk_level?: string;
  risk_title?: string;
  [key: string]: unknown;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function gatewayBaseUrl(): string {
  return process.env.SSLCOMMERZ_IS_LIVE === "true"
    ? "https://securepay.sslcommerz.com"
    : "https://sandbox.sslcommerz.com";
}

function appBaseUrl(): string {
  const value = requiredEnv("APP_BASE_URL").replace(/\/+$/, "");
  const url = new URL(value);
  if (process.env.SSLCOMMERZ_IS_LIVE === "true" && url.protocol !== "https:") {
    throw new Error("APP_BASE_URL must use HTTPS in live mode");
  }
  return url.toString().replace(/\/+$/, "");
}

export function parseBDTToPaisa(amount: string | number): number {
  const text = String(amount).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new Error("Invalid BDT amount returned by gateway");
  }
  const [whole, fraction = ""] = text.split(".");
  const paisa = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(paisa)) throw new Error("BDT amount is out of range");
  return paisa;
}

export class SSLCommerzService {
  async initPayment(params: InitPaymentInput): Promise<string> {
    if (!Number.isSafeInteger(params.amountInPaisa) || params.amountInPaisa <= 0) {
      throw new Error("Payment amount must be a positive integer number of paisa");
    }

    const storeId = requiredEnv("SSLCOMMERZ_STORE_ID");
    const storePasswd = requiredEnv("SSLCOMMERZ_STORE_PASSWD");
    const base = gatewayBaseUrl();
    const appUrl = appBaseUrl();
    const payload = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePasswd,
      total_amount: (params.amountInPaisa / 100).toFixed(2),
      currency: "BDT",
      tran_id: params.tranId,
      success_url: `${appUrl}/api/payments/sslcommerz/success`,
      fail_url: `${appUrl}/api/payments/sslcommerz/fail`,
      cancel_url: `${appUrl}/api/payments/sslcommerz/cancel`,
      ipn_url: `${appUrl}/api/payments/sslcommerz/ipn`,
      cus_name: params.customerName.slice(0, 255),
      cus_email: params.customerEmail.slice(0, 100),
      cus_phone: params.customerPhone.slice(0, 20),
      cus_add1: "Bangladesh",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      product_name: params.productName.slice(0, 255),
      product_category: "SaaS Subscription",
      product_profile: "general",
      shipping_method: "NO",
    });

    const response = await fetch(`${base}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString(),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`SSLCommerz initialization HTTP ${response.status}`);

    const data = (await response.json()) as {
      status?: string;
      GatewayPageURL?: string;
      failedreason?: string;
    };
    if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
      throw new Error(`SSLCommerz session initialization failed: ${data.failedreason ?? "unknown gateway error"}`);
    }

    const gatewayUrl = new URL(data.GatewayPageURL);
    const allowedHosts = process.env.SSLCOMMERZ_IS_LIVE === "true"
      ? ["securepay.sslcommerz.com"]
      : ["sandbox.sslcommerz.com"];
    if (gatewayUrl.protocol !== "https:" || !allowedHosts.includes(gatewayUrl.hostname)) {
      throw new Error("SSLCommerz returned an unexpected gateway URL");
    }
    return gatewayUrl.toString();
  }

  async validateTransaction(valId: string): Promise<SSLCommerzValidation> {
    if (!valId || valId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(valId)) {
      throw new Error("Invalid SSLCommerz validation ID");
    }
    const params = new URLSearchParams({
      val_id: valId,
      store_id: requiredEnv("SSLCOMMERZ_STORE_ID"),
      store_passwd: requiredEnv("SSLCOMMERZ_STORE_PASSWD"),
      v: "1",
      format: "json",
    });
    const response = await fetch(
      `${gatewayBaseUrl()}/validator/api/validationserverAPI.php?${params.toString()}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!response.ok) throw new Error(`SSLCommerz validation HTTP ${response.status}`);
    return (await response.json()) as SSLCommerzValidation;
  }
}

export const sslcommerzService = new SSLCommerzService();
