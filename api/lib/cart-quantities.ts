/**
 * Aggregate duplicate product IDs before stock validation and order creation.
 * The checkout schema validates each individual line; this helper enforces the
 * quantity cap across the entire cart for a given product.
 */
export function aggregateCartQuantities(
  items: ReadonlyArray<{ productId: number; qty: number }>,
  maxPerProduct = 99,
): Map<number, number> {
  const quantities = new Map<number, number>();
  for (const item of items) {
    const quantity = (quantities.get(item.productId) ?? 0) + item.qty;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > maxPerProduct) {
      throw new RangeError("The total quantity of an item cannot exceed 99.");
    }
    quantities.set(item.productId, quantity);
  }
  return quantities;
}
