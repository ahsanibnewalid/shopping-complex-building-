import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { BUSINESS_TYPES, formatMoney } from "@contracts/marketplace";

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [businessType, setBusinessType] = useState<string>("");

  const stats = trpc.marketplace.stats.useQuery();
  const shops = trpc.marketplace.shops.useQuery({
    query: query || undefined,
    businessType: businessType || undefined,
  });
  const featured = trpc.marketplace.products.useQuery({ limit: 10 });

  const categories = useMemo(
    () =>
      stats.data?.categories
        .filter((c): c is string => !!c)
        .slice(0, 8) ?? [],
    [stats.data],
  );

  return (
    <div className="min-h-dvh bg-white text-[#111]">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-[#111]">
        <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-20 sm:px-8 sm:pt-28">
          <p className="micro-label mb-6 text-[#777]">
            A vertical market — {stats.data?.shops ?? "…"} shops under one roof
          </p>
          <h1 className="font-display max-w-5xl text-[11vw] font-black leading-[0.92] tracking-tighter sm:text-7xl lg:text-8xl">
            Every shop in the building, one address.
          </h1>
          <p className="font-serif-body mt-6 max-w-xl text-lg leading-relaxed text-[#444]">
            Browse the directory, walk into a storefront, buy the thing or book
            the service. The whole complex, indexed.
          </p>

          <form
            className="mt-10 flex max-w-2xl"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(query.trim() ? `/products?q=${encodeURIComponent(query.trim())}` : "/products");
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the whole complex — products, services, shops…"
              className="h-12 min-w-0 flex-1 border border-[#111] bg-white px-4 text-base outline-none placeholder:text-[#999] focus:bg-[#f4f4f2]"
              aria-label="Search the complex"
            />
            <button type="submit" className="btn-invert h-12" data-variant="solid">
              Search
            </button>
          </form>

          <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
            {[
              ["Shops", stats.data?.shops],
              ["Listings", stats.data?.products],
              ["Orders placed", stats.data?.orders],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="font-display text-3xl font-800 font-extrabold">
                  {value ?? "—"}
                </p>
                <p className="micro-label text-[#777]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Directory */}
      <section id="directory" className="border-b border-[#111]">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <h2 className="font-display text-4xl font-black tracking-tight">
              The Directory
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setBusinessType("")}
                className={`micro-label cursor-pointer border border-[#111] px-3 py-2 transition-colors ${
                  businessType === "" ? "bg-[#111] text-white" : "text-[#111] hover:bg-[#f4f4f2]"
                }`}
              >
                All
              </button>
              {BUSINESS_TYPES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBusinessType(b.id === businessType ? "" : b.id)}
                  className={`micro-label cursor-pointer border border-[#111] px-3 py-2 transition-colors ${
                    businessType === b.id ? "bg-[#111] text-white" : "text-[#111] hover:bg-[#f4f4f2]"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {shops.isLoading ? (
            <p className="micro-label py-12 text-[#777]">Loading directory…</p>
          ) : !shops.data?.length ? (
            <p className="font-serif-body py-12 text-lg text-[#555]">
              No shops match that filter yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#111] text-left">
                    <th className="micro-label py-3 pr-4 font-normal text-[#777]">No.</th>
                    <th className="micro-label py-3 pr-4 font-normal text-[#777]">Shop</th>
                    <th className="micro-label hidden py-3 pr-4 font-normal text-[#777] sm:table-cell">Type</th>
                    <th className="micro-label hidden py-3 pr-4 font-normal text-[#777] md:table-cell">Category</th>
                    <th className="micro-label hidden py-3 pr-4 font-normal text-[#777] lg:table-cell">Location</th>
                    <th className="micro-label py-3 text-right font-normal text-[#777]">Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.data.map((shop, i) => (
                    <tr
                      key={shop.id}
                      className="cursor-pointer border-b border-[#ddd] transition-colors hover:bg-[#f8e7fe]"
                      onClick={() => navigate(`/shops/${shop.slug}`)}
                    >
                      <td className="micro-label py-4 pr-4 text-[#777]">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="py-4 pr-4">
                        <p className="font-display text-base font-bold">{shop.name}</p>
                        {shop.tagline && (
                          <p className="font-serif-body text-sm italic text-[#777]">
                            {shop.tagline}
                          </p>
                        )}
                      </td>
                      <td className="micro-label hidden py-4 pr-4 capitalize sm:table-cell">
                        {shop.businessType}
                      </td>
                      <td className="micro-label hidden py-4 pr-4 md:table-cell">
                        {shop.category}
                      </td>
                      <td className="micro-label hidden py-4 pr-4 text-[#777] lg:table-cell">
                        {shop.location ?? "—"}
                      </td>
                      <td className="py-4 text-right">
                        <span className="micro-label border border-[#111] px-3 py-2 transition-colors group-hover:bg-[#111]">
                          Enter →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Latest listings across the complex */}
      <section className="border-b border-[#111] bg-[#f4f4f2]">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-display text-4xl font-black tracking-tight">
              New on the shelves
            </h2>
            <Link to="/products" className="nav-link micro-label">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {featured.data?.map(({ product, tenant }) => (
              <ProductCard
                key={product.id}
                name={product.name}
                priceCents={product.priceCents}
                kind={product.kind}
                imageUrl={product.imageUrl}
                shopName={tenant.name}
                stock={product.stock}
                onClick={() => navigate(`/shops/${tenant.slug}/product/${product.id}`)}
              />
            ))}
          </div>
          {categories.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link
                  key={c}
                  to={`/products?category=${encodeURIComponent(c)}`}
                  className="micro-label border border-[#111] bg-white px-3 py-2 transition-colors hover:bg-[#111] hover:text-white"
                >
                  {c}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sell with us */}
      <section className="bg-[#f8e7fe]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-8 px-4 py-16 sm:flex-row sm:items-center sm:px-8">
          <div>
            <p className="micro-label mb-3 text-[#5c4a63]">For tenants</p>
            <h2 className="font-display max-w-xl text-4xl font-black tracking-tight">
              Rent a unit. Get a storefront, an admin panel and a team.
            </h2>
            <p className="font-serif-body mt-3 max-w-lg text-lg text-[#3a2f40]">
              Pick a business type, choose a theme, list your products and
              delegate roles — from {formatMoney(1900)}/month.
            </p>
          </div>
          <Link to="/sell" className="btn-invert shrink-0" data-variant="solid">
            Open a shop
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
