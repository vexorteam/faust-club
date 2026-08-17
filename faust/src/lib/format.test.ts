import { describe, expect, it } from "vitest";
import { formatItemsCount, formatPrice, pluralize } from "@/lib/format";

const NBSP = " ";

describe("formatPrice", () => {
  it("groups thousands with a non-breaking space", () => {
    expect(formatPrice(1250)).toBe(`1${NBSP}250${NBSP}₴`);
  });

  it("leaves short prices ungrouped", () => {
    expect(formatPrice(320)).toBe(`320${NBSP}₴`);
  });

  it("never shows kopecks", () => {
    expect(formatPrice(99999)).toBe(`99${NBSP}999${NBSP}₴`);
    expect(formatPrice(1000)).toBe(`1${NBSP}000${NBSP}₴`);
  });

  it("uses no breakable space at all, so a price cannot wrap", () => {
    expect(formatPrice(12500)).not.toContain(" ");
  });
});

describe("pluralize", () => {
  it("picks the form Ukrainian actually needs", () => {
    const forms = (count: number) => pluralize(count, "позиція", "позиції", "позицій");

    expect(forms(1)).toBe("позиція");
    expect(forms(2)).toBe("позиції");
    expect(forms(5)).toBe("позицій");
    expect(forms(11)).toBe("позицій");
    expect(forms(21)).toBe("позиція");
    expect(forms(112)).toBe("позицій");
  });
});

describe("formatItemsCount", () => {
  it("reads like a sentence, not like a number", () => {
    expect(formatItemsCount(0)).toBe(`0${NBSP}позицій`);
    expect(formatItemsCount(1)).toBe(`1${NBSP}позиція`);
    expect(formatItemsCount(6)).toBe(`6${NBSP}позицій`);
  });
});
