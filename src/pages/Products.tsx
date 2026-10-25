import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { SHOP_CATEGORIES } from "@contracts/marketplace";

/** Cross-complex product search. */
export default function Products() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const category = params.get("category") ?? "";
  const kind = params.get("kind") ?? "";

  const results = trpc.marketplace.products.useQuery({
    query: params.get("q") || undefined,
    category: category || undefined,
    kind: (kind as "product" | "service") || undefined,
    limit: 120,
  });

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (query.trim()) next.set("q", query.trim());
    else next.delete("q");
    setParams(next);
  };

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  return (
    <div className="min-h-dvh bg-white text-[#111]">
      <SiteHeader />
      <main className="mx-auto max-w-[1400px] px-4 py-12 sm:px-8">
        <h1 className="font-display text-5xl font-black tracking-tight">
          All listings
        </h1>

        <form onSubmit={applySearch} className="mt-8 flex max-w-2xl">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products and services…"
            className="h-12 min-w-0 flex-1 border border-[#111] bg-white px-4 text-base outline-none focus:bg-[#f4f4f2]"
            aria-label="Search products"
          />
          <button type="submit" className="btn-invert h-12" data-variant="solid">
            Search
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setParam("kind", "")}
            className={`micro-label cursor-pointer border border-[#111] px-3 py-2 ${!kind ? "bg-[#111] text-white" : "hover:bg-[#f4f4f2]"}`}
          >
            Everything
          </button>
          <button
            onClick={() => setParam("kind", "product")}
            className={`micro-label cursor-pointer border border-[#111] px-3 py-2 ${kind === "product" ? "bg-[#111] text-white" : "hover:bg-[#f4f4f2]"}`}
          >
            Products
          </button>
          <button
            onClick={() => setParam("kind", "service")}
            className={`micro-label cursor-pointer border border-[#111] px-3 py-2 ${kind === "service" ? "bg-[#111] text-white" : "hover:bg-[#f4f4f2]"}`}
          >
            Services
          </button>
          <span className="mx-2 hidden border-l border-[#111] sm:block" />
          {SHOP_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setParam("category", c === category ? "" : c)}
              className={`micro-label cursor-pointer border border-[#111] px-3 py-2 ${category === c ? "bg-[#111] text-white" : "hover:bg-[#f4f4f2]"}`}
            >
              {c}
            </button>
          ))}
        </div>

        {results.isLoading ? (
          <p className="micro-label py-16 text-[#777]">Searching…</p>
        ) : !results.data?.length ? (
          <p className="font-serif-body py-16 text-lg text-[#555]">
            Nothing matches. Try a broader term.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {results.data.map(({ product, tenant }) => (
              <ProductCard
                key={product.id}
                name={product.name}
                priceCents={product.priceCents}
                kind={product.kind}
                imageUrl={product.imageUrl}
                shopName={tenant.name}
                stock={product.stock}
                onClick={() =>
                  navigate(`/shops/${tenant.slug}/product/${product.id}`)
                }
              />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
