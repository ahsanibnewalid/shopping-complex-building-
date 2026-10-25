import { useNavigate, useParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { ShopTheme } from "@/components/ShopTheme";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@contracts/marketplace";
import { useState } from "react";

export default function ProductPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const productId = Number(id);
  const { data, isLoading, error } = trpc.marketplace.product.useQuery(
    { id: productId },
    { enabled: Number.isFinite(productId) },
  );
  const cart = useCart(slug);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="micro-label text-[#777]">Loading…</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white">
        <p className="font-display text-3xl font-black">Off the shelf.</p>
        <Link to={`/shops/${slug}`} className="btn-invert">Back to the shop</Link>
      </div>
    );
  }

  const { product, tenant } = data;
  const purchasable = product.kind === "service" || product.stock > 0;

  return (
    <ShopTheme themeId={tenant.themeId}>
      <header className="t-border border-b">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 sm:px-8">
          <Link to={`/shops/${tenant.slug}`} className="t-label t-muted transition-opacity hover:opacity-70">
            ← {tenant.name}
          </Link>
          <button
            onClick={() => navigate(`/shops/${tenant.slug}/cart`)}
            className="t-accent t-label t-radius cursor-pointer px-4 py-2 transition-transform hover:scale-105"
          >
            Cart ({cart.count})
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-8 lg:grid-cols-2">
        <div className="t-border t-surface t-radius t-border aspect-square overflow-hidden border">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="t-display text-[10rem] font-black opacity-15">
                {product.name.slice(0, 1)}
              </span>
            </div>
          )}
        </div>

        <div>
          <p className="t-label t-muted capitalize">
            {product.kind} · {product.category}
          </p>
          <h1 className="t-display mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            {product.name}
          </h1>
          <p className="t-label mt-4 text-xl">{formatMoney(product.priceCents)}</p>
          {product.kind === "product" && (
            <p className="t-label t-muted mt-1">
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </p>
          )}
          {product.description && (
            <p className="t-body mt-6 max-w-lg text-base leading-relaxed opacity-85">
              {product.description}
            </p>
          )}

          {purchasable ? (
            <div className="mt-8 flex items-stretch gap-3">
              <div className="t-border t-radius flex items-center border">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="t-label cursor-pointer px-4 py-3"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="t-label min-w-8 text-center">{qty}</span>
                <button
                  onClick={() =>
                    setQty(Math.min(product.kind === "product" ? Math.max(1, product.stock) : 99, qty + 1))
                  }
                  className="t-label cursor-pointer px-4 py-3"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => {
                  cart.add(
                    {
                      productId: product.id,
                      name: product.name,
                      priceCents: product.priceCents,
                      imageUrl: product.imageUrl,
                    },
                    qty,
                  );
                  setAdded(true);
                  setTimeout(() => setAdded(false), 1600);
                }}
                className="t-accent t-label t-radius flex-1 cursor-pointer px-6 py-3 transition-transform hover:scale-[1.02]"
              >
                {added ? "Added ✓" : `Add to cart — ${formatMoney(product.priceCents * qty)}`}
              </button>
            </div>
          ) : (
            <p className="t-label mt-8 opacity-60">Currently unavailable.</p>
          )}

          {purchasable && cart.count > 0 && (
            <button
              onClick={() => navigate(`/shops/${tenant.slug}/cart`)}
              className="t-label mt-4 cursor-pointer underline underline-offset-4"
            >
              Go to checkout ({cart.count}) →
            </button>
          )}
        </div>
      </main>
    </ShopTheme>
  );
}
