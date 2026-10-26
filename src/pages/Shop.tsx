import { InquiryForm } from "@/components/Leads";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { ShopTheme } from "@/components/ShopTheme";
import { useCart } from "@/lib/cart";
import { formatMoney, getTheme } from "@contracts/marketplace";

/** A tenant's storefront — fully themed by their chosen theme. */
export default function Shop() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("");

  const shop = trpc.marketplace.shop.useQuery({ slug: slug! }, { enabled: !!slug });
  const products = trpc.marketplace.products.useQuery(
    { shopSlug: slug! },
    { enabled: !!slug },
  );
  const cart = useCart(slug);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.data?.forEach(({ product }) => set.add(product.category ?? "General"));
    return Array.from(set);
  }, [products.data]);

  const visible = useMemo(() => {
    if (!products.data) return [];
    if (!filter) return products.data;
    return products.data.filter(({ product }) => product.category === filter);
  }, [products.data, filter]);

  if (shop.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="micro-label text-[#777]">Opening storefront…</p>
      </div>
    );
  }
  if (shop.error || !shop.data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white">
        <p className="font-display text-3xl font-black">This unit is empty.</p>
        <Link to="/" className="btn-invert">Back to the directory</Link>
      </div>
    );
  }

  const s = shop.data;
  const theme = getTheme(s.themeId);
  const suspended = s.status !== "active";

  return (
    <ShopTheme themeId={s.themeId}>
      {/* Storefront header */}
      <header className="t-border border-b">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 sm:px-8">
          <Link to="/" className="t-label t-muted transition-opacity hover:opacity-70">
            ← BazarHub
          </Link>
          <button
            onClick={() => navigate(`/shops/${s.slug}/cart`)}
            className="t-accent t-label t-radius cursor-pointer px-4 py-2 transition-transform hover:scale-105"
          >
            Cart ({cart.count})
          </button>
        </div>
      </header>

      {suspended && (
        <div className="t-label border-b border-red-800 bg-red-100 px-4 py-3 text-center text-red-900">
          This shop is temporarily closed by the complex management.
        </div>
      )}

      {/* Shop hero */}
      <section className="t-border border-b">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-8 sm:py-20">
          <p className="t-label t-muted mb-4 capitalize">
            {s.businessType} · {s.category}
            {s.location ? ` · ${s.location}` : ""}
          </p>
          <h1 className="t-display max-w-4xl text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
            {s.name}
          </h1>
          {s.tagline && (
            <p className="t-body mt-4 max-w-xl text-xl italic opacity-80">{s.tagline}</p>
          )}
          {s.description && (
            <p className="t-body mt-4 max-w-2xl text-base leading-relaxed opacity-80">
              {s.description}
            </p>
          )}
          {(s.contactEmail || s.phone) && (
            <p className="t-label t-muted mt-6">
              {[s.contactEmail, s.phone].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="t-label t-muted mt-2">Storefront theme — {theme.name}</p>
        </div>
      </section>

      {/* Catalog */}
      <main className="mx-auto max-w-[1400px] px-4 py-12 sm:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter("")}
            className={`t-label t-border t-radius cursor-pointer border px-3 py-2 transition-opacity ${
              !filter ? "t-accent" : "hover:opacity-60"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c === filter ? "" : c)}
              className={`t-label t-border t-radius cursor-pointer border px-3 py-2 transition-opacity ${
                filter === c ? "t-accent" : "hover:opacity-60"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {products.isLoading ? (
          <p className="t-label t-muted py-12">Stocking shelves…</p>
        ) : !visible.length ? (
          <p className="t-body py-12 text-lg opacity-70">
            Nothing in this section yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {visible.map(({ product }) => (
              <article
                key={product.id}
                className="t-border t-surface t-radius group flex flex-col border"
              >
                <button
                  onClick={() => navigate(`/shops/${s.slug}/product/${product.id}`)}
                  className="t-border relative block aspect-square w-full cursor-pointer overflow-hidden border-b text-left"
                  aria-label={`View ${product.name}`}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="t-display text-6xl font-black opacity-15">
                        {product.name.slice(0, 1)}
                      </span>
                    </div>
                  )}
                  {product.kind === "service" && (
                    <span className="t-label t-accent t-radius absolute left-2 top-2 px-2 py-1">
                      Service
                    </span>
                  )}
                </button>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <span className="t-label t-muted">{product.category}</span>
                  <button
                    onClick={() => navigate(`/shops/${s.slug}/product/${product.id}`)}
                    className="t-label cursor-pointer text-left underline-offset-2 hover:underline"
                  >
                    {product.name}
                  </button>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="t-label">{formatMoney(product.priceCents)}</span>
                    {!suspended && (product.kind === "service" || product.stock > 0) && (
                      <button
                        onClick={() =>
                          cart.add({
                            productId: product.id,
                            name: product.name,
                            priceCents: product.priceCents,
                            imageUrl: product.imageUrl,
                          })
                        }
                        className="t-label t-border t-radius cursor-pointer border px-2 py-1 transition-opacity hover:opacity-60"
                        aria-label={`Add ${product.name} to cart`}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      {(s.businessType === "agency" || s.businessType === "company") && <InquiryForm shopSlug={s.slug} />}
      </main>

      <footer className="t-border border-t">
        <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-2 px-4 py-6 sm:flex-row sm:px-8">
          <p className="t-label t-muted">
            {s.name} — a tenant of BazarHub Shopping Complex
          </p>
          <Link to="/" className="t-label transition-opacity hover:opacity-70">
            Back to the directory →
          </Link>
        </div>
      </footer>
    </ShopTheme>
  );
}
