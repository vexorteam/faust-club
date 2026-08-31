import { z } from "zod"

const MAX_PRICE = 99999

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .catch(null)
    .transform(value => (value && value.length > 0 ? value : undefined))

export const menuItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  description: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .catch("")
    .transform(value => value ?? ""),
  price: z.number().int().positive().max(MAX_PRICE),
  volume: optionalText(20),
  image: z
    .url()
    .nullish()
    .catch(null)
    .transform(value => value ?? undefined),
  imageAlt: optionalText(120),
  badge: z
    .enum(["new", "hit"])
    .nullish()
    .catch(null)
    .transform(value => value ?? null),
  available: z
    .boolean()
    .nullish()
    .catch(true)
    .transform(value => value ?? true),
})

/** Keeps the entries that match the contract, reports the ones it drops. */
const collectValid = <T>(schema: z.ZodType<T>, entries: readonly unknown[], what: string): T[] => {
  const valid: T[] = []

  entries.forEach((entry, index) => {
    const parsed = schema.safeParse(entry)

    if (parsed.success) {
      valid.push(parsed.data)
      return
    }

    console.error(`[menu] ${what} #${index} does not match the API contract, skipped`, parsed.error.issues)
  })

  return valid
}

export const menuCategorySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug must be url-safe: [a-z0-9-]"),
  label: z.string().trim().min(1).max(60),
  note: optionalText(120).transform(value => value ?? null),
  items: z
    .array(z.unknown())
    .catch([])
    .transform(entries => collectValid(menuItemSchema, entries, "menu item")),
})

export const menuResponseSchema = z
  .object({ categories: z.array(z.unknown()) })
  .transform(({ categories }) => collectValid(menuCategorySchema, categories, "menu category"))
