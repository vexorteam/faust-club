import { describe, expect, it } from "vitest"

import { adminAtmosphereResponseSchema, atmosphereFormSchema, atmospherePatchSchema } from "@/schemas/atmosphere"

const photo = {
  id: "3c1f",
  label: "Танцпол",
  image: "https://media.faust.bar/atmosphere/3c1f-card.webp",
  imageAlt: "Танцпол Faust під час нічного сету",
  order: 1,
  visible: true,
}

const firstMessage = (input: unknown): string | undefined => {
  const parsed = atmosphereFormSchema.safeParse(input)

  return parsed.success ? undefined : parsed.error.issues[0]?.message
}

describe("atmosphereFormSchema", () => {
  it("accepts a caption and a description that are not the same text", () => {
    const parsed = atmosphereFormSchema.parse({
      label: "Бар",
      imageAlt: "Барна стійка з підсвіткою й барменом за роботою",
      visible: true,
    })

    expect(parsed.label).not.toBe(parsed.imageAlt)
  })

  it("insists on a description, because it replaces the picture", () => {
    expect(firstMessage({ label: "Бар", imageAlt: "", visible: true })).toBe(
      "Опис для скрінрідера — від 5 до 120 символів"
    )
  })

  it("keeps the caption short enough for a tile", () => {
    expect(firstMessage({ label: "б".repeat(61), imageAlt: photo.imageAlt, visible: true })).toBe(
      "Підпис — від 2 до 60 символів"
    )
  })
})

describe("atmospherePatchSchema", () => {
  it("renames a tile without touching the photo", () => {
    expect(atmospherePatchSchema.parse({ label: "VIP-зона" })).toEqual({ label: "VIP-зона" })
  })

  it("refuses an empty patch", () => {
    expect(atmospherePatchSchema.safeParse({}).success).toBe(false)
  })
})

describe("adminAtmosphereResponseSchema", () => {
  it("reads the list the admin grid renders", () => {
    expect(adminAtmosphereResponseSchema.parse({ photos: [photo] }).photos).toHaveLength(1)
  })

  it("does not accept a tile without a picture", () => {
    expect(adminAtmosphereResponseSchema.safeParse({ photos: [{ ...photo, image: null }] }).success).toBe(false)
  })
})
