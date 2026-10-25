import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { formatMoney } from "@contracts/marketplace";

/** Guest order tracking by order number + email. */
export default function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [lookup, setLookup] = useState<{ orderId: number; email: string } | null>(null);

  const result = trpc.orders.track.useQuery(lookup!, {
    enabled: !!lookup,
    retry: false,
  });

  return (
    <div className="min-h-dvh bg-white text-[#111]">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
        <h1 className="font-display text-5xl font-black tracking-tight">Track an order</h1>
        <p className="font-serif-body mt-3 text-lg text-[#555]">
          The order number from your confirmation, plus the email you used.
        </p>

        <form
          className="mt-8 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const id = Number(orderId);
            if (Number.isFinite(id) && id > 0) setLookup({ orderId: id, email });
          }}
        >
          <input
            required
            inputMode="numeric"
            placeholder="Order number, e.g. 1042"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="h-12 w-full border border-[#111] px-4 outline-none focus:bg-[#f4f4f2]"
          />
          <input
            required
            type="email"
            placeholder="Email used at checkout"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full border border-[#111] px-4 outline-none focus:bg-[#f4f4f2]"
          />
          <button type="submit" className="btn-invert w-full" data-variant="solid">
            Find my order
          </button>
        </form>

        {lookup && result.isLoading && (
          <p className="micro-label mt-8 text-[#777]">Looking it up…</p>
        )}
        {lookup && result.error && (
          <p className="micro-label mt-8 text-red-700">
            No order matches that number and email.
          </p>
        )}
        {lookup && result.data && (
          <div className="mt-10 border border-[#111]">
            <div className="flex items-center justify-between border-b border-[#111] bg-[#f4f4f2] px-4 py-3">
              <p className="micro-label">Order #{result.data.order.id}</p>
              <span className="micro-label border border-[#111] bg-white px-2 py-1 capitalize">
                {result.data.order.status}
              </span>
            </div>
            <div className="px-4 py-3">
              <p className="micro-label text-[#777]">
                {result.data.tenant.name} · placed{" "}
                {new Date(result.data.order.createdAt).toLocaleDateString()}
              </p>
              <ul className="mt-3 space-y-2">
                {result.data.items.map((item) => (
                  <li key={item.id} className="flex justify-between text-sm">
                    <span className="font-serif-body">
                      {item.qty} × {item.name}
                    </span>
                    <span className="micro-label">{formatMoney(item.priceCents * item.qty)}</span>
                  </li>
                ))}
              </ul>
              <p className="micro-label mt-4 border-t border-[#ddd] pt-3 text-right">
                Total {formatMoney(result.data.order.totalCents)}
              </p>
              <Link
                to={`/shops/${result.data.tenant.slug}`}
                className="micro-label mt-3 inline-block underline underline-offset-4"
              >
                Visit {result.data.tenant.name} →
              </Link>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
