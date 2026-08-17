import { z } from "zod";

/**
 * Photos of the "Атмосфера" section on the home page (§5.2, §5.3.1).
 *
 * `label` and `imageAlt` are two different texts and both are required:
 * the first is the caption a visitor reads on the tile, the second is what a
 * screen reader says instead of the picture. Duplicating one into the other
 * makes the section useless for anyone who cannot see it, so the form asks for
 * them separately and explains the difference.
 */

export const PHOTO_LABEL_MIN = 2;
export const PHOTO_LABEL_MAX = 60;
export const PHOTO_ALT_MIN = 5;
export const PHOTO_ALT_MAX = 120;

const LABEL_MESSAGE = `Підпис — від ${PHOTO_LABEL_MIN} до ${PHOTO_LABEL_MAX} символів`;
const ALT_MESSAGE = `Опис для скрінрідера — від ${PHOTO_ALT_MIN} до ${PHOTO_ALT_MAX} символів`;

export const atmospherePhotoSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(PHOTO_LABEL_MAX),
  /** A tile without a picture does not exist, so this is never null */
  image: z.url(),
  imageAlt: z.string().trim().min(1).max(PHOTO_ALT_MAX),
  order: z.number().int(),
  visible: z.boolean(),
});

export const adminAtmosphereResponseSchema = z.object({ photos: z.array(atmospherePhotoSchema) });

export const adminAtmospherePhotoResponseSchema = z.object({ photo: atmospherePhotoSchema });

/**
 * `PATCH /admin/atmosphere/{id}` — text and visibility only. Replacing the
 * picture is a separate upload endpoint and arrives with step 11.
 */
export const atmosphereFormSchema = z.object({
  label: z.string().trim().min(PHOTO_LABEL_MIN, LABEL_MESSAGE).max(PHOTO_LABEL_MAX, LABEL_MESSAGE),
  imageAlt: z.string().trim().min(PHOTO_ALT_MIN, ALT_MESSAGE).max(PHOTO_ALT_MAX, ALT_MESSAGE),
  visible: z.boolean(),
});

export const atmospherePatchSchema = atmosphereFormSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "Немає що змінювати");

export type AtmospherePhoto = z.output<typeof atmospherePhotoSchema>;
export type AtmospherePatch = z.output<typeof atmospherePatchSchema>;
