import { describe, expect, it } from "vitest";
import { parseBDTToPaisa } from "./sslcommerz.service";

describe("parseBDTToPaisa", () => {
  it("converts whole taka to paisa", () => {
    expect(parseBDTToPaisa("1500")).toBe(150000);
  });

  it("preserves one or two decimal places exactly", () => {
    expect(parseBDTToPaisa("12.3")).toBe(1230);
    expect(parseBDTToPaisa("12.34")).toBe(1234);
    expect(parseBDTToPaisa("0.01")).toBe(1);
  });

  it("rejects malformed or over-precision gateway amounts", () => {
    expect(() => parseBDTToPaisa("12.345")).toThrow();
    expect(() => parseBDTToPaisa("-1.00")).toThrow();
    expect(() => parseBDTToPaisa("1e3")).toThrow();
    expect(() => parseBDTToPaisa("")).toThrow();
  });
});
