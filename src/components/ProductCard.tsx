import { formatMoney } from "@contracts/marketplace";

interface ProductCardProps {
  name: string;
  priceCents: number;
  kind: "product" | "service";
  imageUrl?: string | null;
  shopName?: string;
  stock?: number;
  onClick?: () => void;
  onAdd?: () => void;
}

/**
 * Product tile: square imagery or a typographic monogram placeholder,
 * mono micro-labels for name/price (reference pattern).
 */
export function ProductCard({
  name,
  priceCents,
  kind,
  imageUrl,
  shopName,
  stock,
  onClick,
  onAdd,
}: ProductCardProps) {
  const soldOut = kind === "product" && stock !== undefined && stock <= 0;
  return (
    <div className="group flex flex-col border border-[#111] bg-white">
      <button
        onClick={onClick}
        className="relative block aspect-square w-full cursor-pointer overflow-hidden border-b border-[#111] text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#111]"
        aria-label={`View ${name}`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#f4f4f2]">
            <span className="font-display text-6xl font-black text-[#111] opacity-15 transition-opacity group-hover:opacity-30">
              {name.slice(0, 1)}
            </span>
          </div>
        )}
        {kind === "service" && (
          <span className="micro-label absolute left-2 top-2 bg-[#111] px-2 py-1 text-white">
            Service
          </span>
        )}
        {soldOut && (
          <span className="micro-label absolute right-2 top-2 border border-[#111] bg-white px-2 py-1 text-[#111]">
            Sold Out
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {shopName && (
          <span className="micro-label text-[#777]">{shopName}</span>
        )}
        <button
          onClick={onClick}
          className="micro-label cursor-pointer text-left text-[#111] underline-offset-2 hover:underline"
        >
          {name}
        </button>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="micro-label text-[#111]">{formatMoney(priceCents)}</span>
          {onAdd && !soldOut && (
            <button
              onClick={onAdd}
              className="micro-label cursor-pointer border border-[#111] px-2 py-1 text-[#111] transition-colors hover:bg-[#6ae06a]"
              aria-label={`Add ${name} to cart`}
            >
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
