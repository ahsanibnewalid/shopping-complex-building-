import { describe, expect, it } from "vitest";
import { aggregateCartQuantities } from "./cart-quantities";

describe("aggregateCartQuantities", () => {
  it("combines repeated product IDs before stock checks", () => {
    expect(
      [...aggregateCartQuantities([
        { productId: 4, qty: 2 },
        { productId: 9, qty: 1 },
        { productId: 4, qty: 3 },
      ])],
    ).toEqual([[4, 5], [9, 1]]);
  });

  it("accepts the maximum aggregate quantity", () => {
    expect([...aggregateCartQuantities([
      { productId: 1, qty: 50 },
      { productId: 1, qty: 49 },
    ])]).toEqual([[1, 99]]);
  });

  it("rejects duplicate lines whose combined quantity exceeds the cap", () => {
    expect(() => aggregateCartQuantities([
      { productId: 1, qty: 60 },
      { productId: 1, qty: 40 },
    ])).toThrow(RangeError);
  });
});
