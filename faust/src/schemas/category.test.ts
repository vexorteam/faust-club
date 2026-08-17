import { describe, expect, it } from "vitest";
import {
  adminCategoriesResponseSchema,
  categoryFormSchema,
  categoryPatchSchema,
  categorySlugSchema,
  moveSchema,
} from "@/schemas/category";

const valid = { slug: "signature", label: "Авторські коктейлі", note: "подаються з 22:00", visible: true };

const firstMessage = (input: unknown): string | undefined => {
  const parsed = categoryFormSchema.safeParse(input);

  return parsed.success ? undefined : parsed.error.issues[0]?.message;
};

describe("categorySlugSchema", () => {
  it("accepts what belongs in a url anchor", () => {
    expect(categorySlugSchema.parse("non-alcoholic")).toBe("non-alcoholic");
    expect(categorySlugSchema.parse("  Signature  ")).toBe("signature");
  });

  it("rejects an address that would have to be percent-encoded", () => {
    expect(categorySlugSchema.safeParse("Класика").success).toBe(false);
    expect(categorySlugSchema.safeParse("wine spirits").success).toBe(false);
    expect(categorySlugSchema.safeParse("wine_spirits").success).toBe(false);
  });
});

describe("categoryFormSchema", () => {
  it("accepts a filled-in form", () => {
    expect(categoryFormSchema.parse(valid)).toEqual(valid);
  });

  it("explains a bad address in the owner's language", () => {
    expect(firstMessage({ ...valid, slug: "Класика" })).toBe("Адреса — лише малі латинські літери, цифри й дефіс");
  });

  it("keeps the title within the bounds the API enforces", () => {
    expect(firstMessage({ ...valid, label: "Я" })).toBe("Назва — від 2 до 60 символів");
    expect(firstMessage({ ...valid, label: "я".repeat(61) })).toBe("Назва — від 2 до 60 символів");
  });

  it("treats a blank caption as no caption", () => {
    expect(categoryFormSchema.parse({ ...valid, note: "   " }).note).toBeNull();
    expect(categoryFormSchema.parse({ ...valid, note: undefined }).note).toBeNull();
  });
});

describe("categoryPatchSchema", () => {
  it("carries a single field — that is what an inline rename sends", () => {
    expect(categoryPatchSchema.parse({ label: "Класика" })).toEqual({ label: "Класика" });
  });

  it("does not smuggle visibility into an unrelated patch", () => {
    expect(categoryPatchSchema.parse({ label: "Класика" })).not.toHaveProperty("visible");
  });

  it("refuses an empty patch", () => {
    expect(categoryPatchSchema.safeParse({}).success).toBe(false);
  });
});

describe("moveSchema", () => {
  it("knows exactly two directions", () => {
    expect(moveSchema.parse({ direction: "up" }).direction).toBe("up");
    expect(moveSchema.safeParse({ direction: "top" }).success).toBe(false);
  });
});

describe("adminCategoriesResponseSchema", () => {
  it("reads the list with its counters", () => {
    const parsed = adminCategoriesResponseSchema.parse({
      categories: [{ id: "cat-1", slug: "shots", label: "Шоти", note: null, order: 2, visible: false, itemsCount: 6 }],
    });

    expect(parsed.categories[0]).toMatchObject({ label: "Шоти", visible: false, itemsCount: 6 });
  });

  it("does not accept a category the page could not link to", () => {
    expect(
      adminCategoriesResponseSchema.safeParse({
        categories: [{ id: "cat-1", slug: "Шоти", label: "Шоти", note: null, order: 1, visible: true, itemsCount: 0 }],
      }).success,
    ).toBe(false);
  });
});
