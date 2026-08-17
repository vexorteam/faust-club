import { z } from "zod";

/**
 * Menu categories: the form the owner fills in and the shape the admin API
 * answers with (contract §5.3.1).
 *
 * Unlike the public menu parser, these schemas are strict. On the showcase a
 * broken entry is dropped so the rest of the card survives; in the admin area
 * the owner has to see exactly what the database holds — silently hiding a row
 * would look like something disappeared on its own.
 */

export const CATEGORY_LABEL_MIN = 2;
export const CATEGORY_LABEL_MAX = 60;
export const CATEGORY_NOTE_MAX = 120;
export const CATEGORY_SLUG_MAX = 60;

const SLUG_PATTERN = /^[a-z0-9-]+$/;

const SLUG_MESSAGE = "Адреса — лише малі латинські літери, цифри й дефіс";
const LABEL_MESSAGE = `Назва — від ${CATEGORY_LABEL_MIN} до ${CATEGORY_LABEL_MAX} символів`;
const NOTE_MESSAGE = `Підпис — не довше ${CATEGORY_NOTE_MAX} символів`;

/** Empty text and an absent value mean the same thing to the API: `null`. */
const nullableText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null));

export const categorySlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Вкажіть адресу категорії")
  .max(CATEGORY_SLUG_MAX, `Адреса — не довше ${CATEGORY_SLUG_MAX} символів`)
  .regex(SLUG_PATTERN, SLUG_MESSAGE);

export const categoryLabelSchema = z
  .string()
  .trim()
  .min(CATEGORY_LABEL_MIN, LABEL_MESSAGE)
  .max(CATEGORY_LABEL_MAX, LABEL_MESSAGE);

/** What the create form sends. Editing reuses this partially — see below. */
export const categoryFormSchema = z.object({
  slug: categorySlugSchema,
  label: categoryLabelSchema,
  note: nullableText(CATEGORY_NOTE_MAX, NOTE_MESSAGE),
  visible: z.boolean(),
});

/**
 * `PATCH /admin/categories/{id}` takes any subset of the fields, so an inline
 * rename does not have to resend the whole category. An empty patch is
 * rejected: it would be a pointless write.
 */
export const categoryPatchSchema = categoryFormSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "Немає що змінювати");

export const adminCategorySchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(SLUG_PATTERN),
  label: z.string().trim().min(1).max(CATEGORY_LABEL_MAX),
  note: nullableText(CATEGORY_NOTE_MAX, NOTE_MESSAGE),
  order: z.number().int(),
  visible: z.boolean(),
  /** How many items live in the category — the API counts, the form only shows */
  itemsCount: z.number().int().nonnegative(),
});

export const adminCategoriesResponseSchema = z.object({ categories: z.array(adminCategorySchema) });

export const adminCategoryResponseSchema = z.object({ category: adminCategorySchema });

export const moveSchema = z.object({ direction: z.enum(["up", "down"]) });

export type CategoryInput = z.output<typeof categoryFormSchema>;
export type CategoryPatch = z.output<typeof categoryPatchSchema>;
export type AdminCategory = z.output<typeof adminCategorySchema>;
export type MoveDirection = z.output<typeof moveSchema>["direction"];
