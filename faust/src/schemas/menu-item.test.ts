import { describe, expect, it } from "vitest";
import {
  adminItemsResponseSchema,
  adminMenuItemSchema,
  menuItemFormSchema,
  menuItemPatchSchema,
} from "@/schemas/menu-item";

const valid = {
  categoryId: "9f3a1c7e",
  name: "Faust Sour",
  description: "бурбон, лимон, яєчний білок, ангостура",
  price: "320",
  volume: "250 мл",
  badge: "hit",
  available: true,
};

const firstMessage = (input: unknown): string | undefined => {
  const parsed = menuItemFormSchema.safeParse(input);

  return parsed.success ? undefined : parsed.error.issues[0]?.message;
};

describe("menuItemFormSchema", () => {
  it("accepts what the form sends and hands over a number", () => {
    const parsed = menuItemFormSchema.parse(valid);

    expect(parsed.price).toBe(320);
    expect(parsed.badge).toBe("hit");
    expect(parsed.available).toBe(true);
  });

  it("rejects a free drink and a negative price alike", () => {
    expect(firstMessage({ ...valid, price: "0" })).toBe("Ціна — від 1 до 99999 ₴");
    expect(firstMessage({ ...valid, price: "-100" })).toBe("Ціна — від 1 до 99999 ₴");
  });

  it("refuses kopecks instead of silently rounding them", () => {
    expect(firstMessage({ ...valid, price: "320.50" })).toBe("Ціна — ціле число гривень");
  });

  it("understands a price typed with a space or a comma", () => {
    expect(menuItemFormSchema.parse({ ...valid, price: "1 250" }).price).toBe(1250);
    expect(menuItemFormSchema.parse({ ...valid, price: "1250,00" }).price).toBe(1250);
  });

  it("asks for a price instead of reading an empty field as zero", () => {
    expect(firstMessage({ ...valid, price: "" })).toBe("Ціна — ціле число гривень");
    expect(firstMessage({ ...valid, price: "дорого" })).toBe("Ціна — ціле число гривень");
  });

  it("insists on a category, because an item has nowhere else to live", () => {
    expect(firstMessage({ ...valid, categoryId: "" })).toBe("Оберіть категорію");
  });

  it("keeps names within the bounds the API enforces", () => {
    expect(firstMessage({ ...valid, name: "Я" })).toBe("Назва — від 2 до 80 символів");
    expect(firstMessage({ ...valid, name: "я".repeat(81) })).toBe("Назва — від 2 до 80 символів");
  });

  it("turns empty optional text into null, not into an empty string", () => {
    const parsed = menuItemFormSchema.parse({ ...valid, description: "", volume: "   ", badge: "" });

    expect(parsed.description).toBeNull();
    expect(parsed.volume).toBeNull();
    expect(parsed.badge).toBeNull();
  });
});

describe("menuItemPatchSchema", () => {
  it("takes a single field — that is how the availability switch saves", () => {
    expect(menuItemPatchSchema.parse({ available: false })).toEqual({ available: false });
  });

  it("takes a moved item's new category on its own", () => {
    expect(menuItemPatchSchema.parse({ categoryId: "other" })).toEqual({ categoryId: "other" });
  });

  it("refuses an empty patch instead of writing nothing", () => {
    expect(menuItemPatchSchema.safeParse({}).success).toBe(false);
  });
});

describe("adminMenuItemSchema", () => {
  const item = {
    id: "9f3a",
    categoryId: "cat-1",
    name: "Негроні",
    description: null,
    price: 280,
    volume: null,
    image: null,
    imageAlt: null,
    badge: null,
    available: false,
    order: 3,
  };

  it("reads an item that carries nothing optional", () => {
    expect(adminMenuItemSchema.parse(item)).toMatchObject({ price: 280, available: false, image: null });
  });

  it("is strict on purpose: a malformed row must not be hidden from the owner", () => {
    expect(adminMenuItemSchema.safeParse({ ...item, price: "280" }).success).toBe(false);
    expect(adminMenuItemSchema.safeParse({ ...item, available: undefined }).success).toBe(false);
  });

  it("reads the grouped list the admin page renders", () => {
    const parsed = adminItemsResponseSchema.parse({
      categories: [{ id: "cat-1", slug: "signature", label: "Авторські", visible: true, items: [item] }],
    });

    expect(parsed.categories[0]?.items).toHaveLength(1);
  });
});
