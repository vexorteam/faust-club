import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";
import { categorySlugSchema } from "@/schemas/category";

describe("slugify", () => {
  it("transliterates a Ukrainian title into a url-safe address", () => {
    expect(slugify("Авторські коктейлі")).toBe("avtorski-kokteili");
    expect(slugify("Вино й ігристе")).toBe("vyno-y-ihryste");
    expect(slugify("Безалкогольне")).toBe("bezalkoholne");
  });

  it("uses the word-initial forms where they differ", () => {
    expect(slugify("Їжа")).toBe("yizha");
    expect(slugify("Яблуко")).toBe("yabluko");
  });

  it("keeps latin names as they are", () => {
    expect(slugify("Faust Sour")).toBe("faust-sour");
  });

  it("collapses punctuation instead of encoding it", () => {
    expect(slugify("  Шоти / міцне!  ")).toBe("shoty-mitsne");
    expect(slugify("Кава — 100%")).toBe("kava-100");
  });

  it("produces something the schema accepts", () => {
    for (const title of ["Авторські коктейлі", "П'ятниця", "Вино й ігристе", "Snacks & Sides"]) {
      expect(categorySlugSchema.safeParse(slugify(title)).success).toBe(true);
    }
  });

  it("returns an empty string when there is nothing to transliterate", () => {
    expect(slugify("—")).toBe("");
    expect(categorySlugSchema.safeParse(slugify("—")).success).toBe(false);
  });
});
