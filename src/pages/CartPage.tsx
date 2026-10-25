import { useState } from "react";
import { Link, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { ShopTheme } from "@/components/ShopTheme";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@contracts/marketplace";

/** Per-shop cart + guest checkout. */
export default function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const shop = trpc.marketplace.shop.useQuery({ slug: slug! }, { enabled: !!slug });
  const cart = useCart(slug);
  const placeOrder = trpc.orders.create.useMutation();

  const [form, setForm] = useState({ name: "", email: "", phone: "", note: "" });
  const [placed, setPlaced] = useState<{ orderId: number; totalCents: number } | null>(null);

  const themeId = shop.data?.themeId ?? "archive";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !cart.lines.length) return;
    placeOrder.mutate(
      {
        shopSlug: slug,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone || undefined,
        note: form.note || undefined,
        items: cart.lines.map((l) => ({ productId: l.productId, qty: l.qty })),
      },
      {
        onSuccess: (res) => {
          setPlaced(res);
          cart.clear();
        },
      },
    );
  };

  const field =
    "t-label h-11 w-full border bg-transparent px-3 outline-none focus:opacity-70";

  return (
    <ShopTheme themeId={themeId}>
      <header className="t-border border-b">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 sm:px-8">
          <Link to={`/shops/${slug}`} className="t-label t-muted transition-opacity hover:opacity-70">
            ← {shop.data?.name ?? "Shop"}
          </Link>
          <span className="t-label">Checkout</span>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-4 py-12 sm:px-8">
        {placed ? (
          <div className="t-border t-surface t-radius border p-8 text-center">
            <p className="t-label t-muted">Order confirmed</p>
            <p className="t-display mt-4 text-6xl font-black">#{placed.orderId}</p>
            <p className="t-body mt-4 text-lg opacity-80">
              Total {formatMoney(placed.totalCents)}. The shop has your order —
              keep this number and your email to track it.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link to="/track-order" className="t-label t-border t-radius border px-4 py-3">
                Track this order
              </Link>
              <Link to={`/shops/${slug}`} className="t-label t-accent t-radius px-4 py-3">
                Keep browsing
              </Link>
            </div>
          </div>
        ) : cart.lines.length === 0 ? (
          <div className="py-16 text-center">
            <p className="t-display text-4xl font-black">Your basket is empty.</p>
            <Link to={`/shops/${slug}`} className="t-label mt-6 inline-block underline underline-offset-4">
              Back to the shelves →
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            <div>
              <h1 className="t-display mb-6 text-3xl font-black">Your basket</h1>
              <ul>
                {cart.lines.map((l) => (
                  <li key={l.productId} className="t-border flex items-center gap-4 border-b py-4">
                    <div className="t-border t-surface flex h-16 w-16 shrink-0 items-center justify-center border">
                      {l.imageUrl ? (
                        <img src={l.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="t-display text-2xl font-black opacity-25">
                          {l.name.slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="t-label truncate">{l.name}</p>
                      <p className="t-label t-muted">{formatMoney(l.priceCents)}</p>
                    </div>
                    <div className="t-border flex items-center border">
                      <button onClick={() => cart.setQty(l.productId, l.qty - 1)} className="t-label cursor-pointer px-3 py-2" aria-label="Decrease">−</button>
                      <span className="t-label min-w-6 text-center">{l.qty}</span>
                      <button onClick={() => cart.setQty(l.productId, l.qty + 1)} className="t-label cursor-pointer px-3 py-2" aria-label="Increase">+</button>
                    </div>
                    <button
                      onClick={() => cart.remove(l.productId)}
                      className="t-label t-muted cursor-pointer hover:opacity-60"
                      aria-label={`Remove ${l.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <p className="t-display mt-6 text-right text-2xl font-black">
                {formatMoney(cart.totalCents)}
              </p>
            </div>

            <form onSubmit={submit} className="t-border t-surface t-radius h-fit border p-6">
              <p className="t-label t-muted mb-4">Guest checkout — no account needed</p>
              <div className="space-y-3">
                <input
                  required
                  minLength={2}
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`${field} t-border`}
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`${field} t-border`}
                />
                <input
                  placeholder="Phone (optional)"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={`${field} t-border`}
                />
                <textarea
                  placeholder="Note for the shop (optional)"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className={`${field} t-border h-20 resize-none py-2`}
                />
              </div>
              {placeOrder.error && (
                <p className="t-label mt-3 text-red-600">{placeOrder.error.message}</p>
              )}
              <button
                type="submit"
                disabled={placeOrder.isPending}
                className="t-accent t-label t-radius mt-4 w-full cursor-pointer py-3 transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {placeOrder.isPending ? "Placing…" : `Place order — ${formatMoney(cart.totalCents)}`}
              </button>
            </form>
          </div>
        )}
      </main>
    </ShopTheme>
  );
}
