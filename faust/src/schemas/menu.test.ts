import { beforeEach, describe, expect, it, vi } from "vitest";
import { menuResponseSchema } from "@/schemas/menu";

const category = (items: unknown[]) => ({
  categories: [{ slug: "signature", label: "Авторські коктейлі", note: null, items }],
});

const item = (overrides: Record<string, unknown> = {}) => ({
  id: "faust-sour",
  name: "Faust Sour",
  description: "бурбон, лимон, яєчний білок, ангостура",
  price: 320,
  ...overrides,
});

const parse = (payload: unknown) => {
  const result = menuResponseSchema.safeParse(payload);
  if (!result.success) throw new Error("payload rejected");

  return result.data;
};

describe("menuResponseSchema", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("keeps a valid item as it comes", () => {
    const [first] = parse(category([item({ volume: "250 мл", badge: "hit" })]));

    expect(first?.items).toHaveLength(1);
    expect(first?.items[0]).toMatchObject({ name: "Faust Sour", price: 320, volume: "250 мл", badge: "hit" });
  });

  it("drops an item without a name", () => {
    const [first] = parse(category([item({ name: "" }), item({ id: "negroni", name: "Negroni" })]));

    expect(first?.items.map((i) => i.name)).toEqual(["Negroni"]);
  });

  it("drops an item without a usable price", () => {
    const [first] = parse(category([item({ price: "320" }), item({ id: "free", price: 0 })]));

    expect(first?.items).toHaveLength(0);
  });

  it("carries available: false through to the component", () => {
    const [first] = parse(category([item({ available: false })]));

    expect(first?.items[0]?.available).toBe(false);
  });

  it("treats a missing availability flag as available", () => {
    const [first] = parse(category([item()]));

    expect(first?.items[0]?.available).toBe(true);
  });

  it("normalises nullable fields into absent ones", () => {
    const [first] = parse(category([item({ image: null, imageAlt: null, volume: null })]));

    expect(first?.items[0]?.image).toBeUndefined();
    expect(first?.items[0]?.imageAlt).toBeUndefined();
    expect(first?.items[0]?.volume).toBeUndefined();
  });

  it("keeps the item when only its photo is broken", () => {
    const [first] = parse(category([item({ image: "not-a-url", badge: "legendary" })]));

    expect(first?.items[0]?.name).toBe("Faust Sour");
    expect(first?.items[0]?.image).toBeUndefined();
    expect(first?.items[0]?.badge).toBeNull();
  });

  it("drops a category whose slug is not url-safe", () => {
    const parsed = parse({
      categories: [
        { slug: "Авторські", label: "Авторські коктейлі", items: [] },
        { slug: "classic", label: "Класика", items: [] },
      ],
    });

    expect(parsed.map((c) => c.slug)).toEqual(["classic"]);
  });

  it("accepts an empty menu as a valid answer", () => {
    expect(parse({ categories: [] })).toEqual([]);
  });

  it("rejects a payload that is not the menu envelope", () => {
    expect(menuResponseSchema.safeParse({ items: [] }).success).toBe(false);
  });
});
