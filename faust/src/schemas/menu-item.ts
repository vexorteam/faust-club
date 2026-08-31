import { z } from "zod"

import { IMAGE_ALT_MAX, imageAltSchema } from "@/schemas/image"

export const ITEM_NAME_MIN = 2
export const ITEM_NAME_MAX = 80
export const ITEM_DESCRIPTION_MAX = 200
export const ITEM_VOLUME_MAX = 20
export const ITEM_PRICE_MIN = 1
export const ITEM_PRICE_MAX = 99999

const NAME_MESSAGE = `Назва — від ${ITEM_NAME_MIN} до ${ITEM_NAME_MAX} символів`
const DESCRIPTION_MESSAGE = `Склад — не довше ${ITEM_DESCRIPTION_MAX} символів`
const VOLUME_MESSAGE = `Об'єм — не довше ${ITEM_VOLUME_MAX} символів`
const PRICE_MESSAGE = "Ціна — ціле число гривень"
const PRICE_RANGE_MESSAGE = `Ціна — від ${ITEM_PRICE_MIN} до ${ITEM_PRICE_MAX} ₴`

const nullableText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullish()
    .transform(value => (value && value.length > 0 ? value : null))

export const menuItemBadgeSchema = z.enum(["new", "hit"])

/**
 * "Без мітки" is an empty `<option>`, so an empty string has to mean the same
 * thing as an absent badge. Doing that here keeps the mapping out of the form.
 */
const badgeFieldSchema = z.preprocess(
  value => (value === "" ? null : value),
  menuItemBadgeSchema.nullish().transform(value => value ?? null)
)

/**
 * A form field arrives as a string. Whitespace and a decimal comma are
 * tolerated ("1 250", "320,00" — the owner types on a phone), anything that is
 * not a whole number of hryvnias is not.
 */
const priceSchema = z.preprocess(
  value => {
    if (typeof value !== "string") return value

    const normalized = value.replace(/\s/g, "").replace(",", ".")

    if (normalized.length === 0) return undefined

    const parsed = Number(normalized)

    return Number.isFinite(parsed) ? parsed : value
  },
  z
    .number({ error: PRICE_MESSAGE })
    .int(PRICE_MESSAGE)
    .min(ITEM_PRICE_MIN, PRICE_RANGE_MESSAGE)
    .max(ITEM_PRICE_MAX, PRICE_RANGE_MESSAGE)
)

export const menuItemFormSchema = z.object({
  /** An item always belongs to a category — there is no loose item */
  categoryId: z.string().trim().min(1, "Оберіть категорію"),
  name: z.string().trim().min(ITEM_NAME_MIN, NAME_MESSAGE).max(ITEM_NAME_MAX, NAME_MESSAGE),
  description: nullableText(ITEM_DESCRIPTION_MAX, DESCRIPTION_MESSAGE),
  price: priceSchema,
  volume: nullableText(ITEM_VOLUME_MAX, VOLUME_MESSAGE),
  badge: badgeFieldSchema,
  available: z.boolean(),
})

export const menuItemPatchSchema = menuItemFormSchema
  .partial()
  .extend({ imageAlt: imageAltSchema.optional() })
  .refine(patch => Object.keys(patch).length > 0, "Немає що змінювати")

export const adminMenuItemSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().trim().min(1).max(ITEM_NAME_MAX),
  description: nullableText(ITEM_DESCRIPTION_MAX, DESCRIPTION_MESSAGE),
  price: z.number().int(),
  volume: nullableText(ITEM_VOLUME_MAX, VOLUME_MESSAGE),
  /** Ready absolute URL, never a storage key: the frontend knows no bucket layout */
  image: z
    .url()
    .nullish()
    .transform(value => value ?? null),
  imageAlt: nullableText(IMAGE_ALT_MAX, `Опис фото — не довше ${IMAGE_ALT_MAX} символів`),
  badge: menuItemBadgeSchema.nullish().transform(value => value ?? null),
  available: z.boolean(),
  order: z.number().int(),
})

/** `GET /admin/items` — everything, grouped by category, hidden ones included. */
export const adminItemGroupSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  label: z.string().trim().min(1),
  visible: z.boolean(),
  items: z.array(adminMenuItemSchema),
})

export const adminItemsResponseSchema = z.object({ categories: z.array(adminItemGroupSchema) })

export const adminItemResponseSchema = z.object({ item: adminMenuItemSchema })

/** `POST /admin/items/{id}/image` answers with the stored photo, not the whole item. */
export const itemImageResponseSchema = z.object({
  image: z.url(),
  imageAlt: z.string().trim().min(1).max(IMAGE_ALT_MAX),
})

export type MenuItemInput = z.output<typeof menuItemFormSchema>
export type MenuItemPatch = z.output<typeof menuItemPatchSchema>
export type AdminMenuItem = z.output<typeof adminMenuItemSchema>
export type AdminItemGroup = z.output<typeof adminItemGroupSchema>
export type ItemImage = z.output<typeof itemImageResponseSchema>
export type MenuItemBadgeValue = z.output<typeof menuItemBadgeSchema>
