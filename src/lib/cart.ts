import { useCallback, useEffect, useState } from "react";

export interface CartLine {
  productId: number;
  name: string;
  priceCents: number;
  qty: number;
  imageUrl?: string | null;
}

const keyFor = (slug: string) => `bazarhub-cart:${slug}`;

function read(slug: string): CartLine[] {
  try {
    const raw = localStorage.getItem(keyFor(slug));
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function write(slug: string, lines: CartLine[]) {
  localStorage.setItem(keyFor(slug), JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent("bazarhub:cart", { detail: slug }));
}

/** Per-shop cart stored in the browser; the order itself persists server-side. */
export function useCart(slug: string | undefined) {
  const [lines, setLines] = useState<CartLine[]>(() => (slug ? read(slug) : []));

  useEffect(() => {
    if (!slug) return;
    setLines(read(slug));
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail === slug) setLines(read(slug));
    };
    window.addEventListener("bazarhub:cart", onChange);
    return () => window.removeEventListener("bazarhub:cart", onChange);
  }, [slug]);

  const add = useCallback(
    (line: Omit<CartLine, "qty">, qty = 1) => {
      if (!slug) return;
      const current = read(slug);
      const existing = current.find((l) => l.productId === line.productId);
      if (existing) existing.qty = Math.min(99, existing.qty + qty);
      else current.push({ ...line, qty });
      write(slug, [...current]);
    },
    [slug],
  );

  const setQty = useCallback(
    (productId: number, qty: number) => {
      if (!slug) return;
      const current = read(slug)
        .map((l) =>
          l.productId === productId ? { ...l, qty: Math.max(0, Math.min(99, qty)) } : l,
        )
        .filter((l) => l.qty > 0);
      write(slug, current);
    },
    [slug],
  );

  const remove = useCallback(
    (productId: number) => {
      if (!slug) return;
      write(slug, read(slug).filter((l) => l.productId !== productId));
    },
    [slug],
  );

  const clear = useCallback(() => {
    if (!slug) return;
    write(slug, []);
  }, [slug]);

  const totalCents = lines.reduce((s, l) => s + l.priceCents * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  return { lines, add, setQty, remove, clear, totalCents, count };
}
