import { z } from "zod";

export const SITE_NAME_MAX = 60;
export const TAGLINE_MAX = 120;
export const SITE_DESCRIPTION_MAX = 300;
export const PHONE_MAX = 30;
export const EMAIL_MAX = 120;
export const ADDRESS_MAX = 160;
export const ADDRESS_SHORT_MAX = 80;
export const URL_MAX = 300;
export const AGE_RESTRICTION_MAX = 10;
export const SOCIAL_NAME_MAX = 40;
export const SOCIAL_HANDLE_MAX = 60;

const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max, message);

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_MESSAGE = "Час у форматі ГГ:ХВ, наприклад 18:00";

export const siteSettingsFormSchema = z.object({
  name: requiredText(SITE_NAME_MAX, `Назва — від 1 до ${SITE_NAME_MAX} символів`),
  tagline: requiredText(TAGLINE_MAX, `Слоган — від 1 до ${TAGLINE_MAX} символів`),
  description: requiredText(SITE_DESCRIPTION_MAX, `Опис — від 1 до ${SITE_DESCRIPTION_MAX} символів`),
  phone: requiredText(PHONE_MAX, `Телефон — від 1 до ${PHONE_MAX} символів`),
  phoneHref: requiredText(PHONE_MAX, "Посилання виду tel:+380..."),
  email: requiredText(EMAIL_MAX, `Пошта — від 1 до ${EMAIL_MAX} символів`),
  emailHref: requiredText(EMAIL_MAX, "Посилання виду mailto:..."),
  address: requiredText(ADDRESS_MAX, `Адреса — від 1 до ${ADDRESS_MAX} символів`),
  addressShort: requiredText(ADDRESS_SHORT_MAX, `Коротка адреса — від 1 до ${ADDRESS_SHORT_MAX} символів`),
  mapsUrl: requiredText(URL_MAX, "Посилання на Google Maps"),
  mapsEmbedQuery: requiredText(ADDRESS_MAX, "Рядок пошуку для вбудованої карти"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  ageRestriction: requiredText(AGE_RESTRICTION_MAX, "Наприклад, 16+"),
});

export const siteSettingsPatchSchema = siteSettingsFormSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "Немає що змінювати");

export const adminSiteSettingsSchema = z.object({
  id: z.string().min(1),
  ...siteSettingsFormSchema.shape,
});

export const siteSettingsResponseSchema = z.object({ settings: adminSiteSettingsSchema });

export const socialFormSchema = z.object({
  name: requiredText(SOCIAL_NAME_MAX, `Назва мережі — від 1 до ${SOCIAL_NAME_MAX} символів`),
  href: requiredText(URL_MAX, "Посилання на профіль"),
  handle: requiredText(SOCIAL_HANDLE_MAX, `Позначка — від 1 до ${SOCIAL_HANDLE_MAX} символів`),
});

export const socialPatchSchema = socialFormSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "Немає що змінювати");

export const adminSocialSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(SOCIAL_NAME_MAX),
  href: z.string().trim().min(1).max(URL_MAX),
  handle: z.string().trim().min(1).max(SOCIAL_HANDLE_MAX),
  order: z.number().int(),
});

export const adminSocialsResponseSchema = z.object({ socials: z.array(adminSocialSchema) });
export const adminSocialResponseSchema = z.object({ social: adminSocialSchema });

export const publicSocialSchema = z.object({
  name: z.string().trim().min(1).max(SOCIAL_NAME_MAX),
  href: z.string().trim().min(1).max(URL_MAX),
  handle: z.string().trim().min(1).max(SOCIAL_HANDLE_MAX),
});

const optionalTime = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || TIME_PATTERN.test(value), TIME_MESSAGE);

export const hoursFormSchema = z
  .object({ open: optionalTime, close: optionalTime, closesNextDay: z.boolean() })
  .refine((value) => (value.open === null) === (value.close === null), {
    message: "Час відкриття й закриття вказуються разом, або жодного — вихідний день",
    path: ["open"],
  });

export const hoursPatchSchema = hoursFormSchema;

export const adminHoursSchema = z.object({
  id: z.string().min(1),
  day: z.number().int().min(1).max(7),
  label: z.string().trim().min(1).max(20),
  open: z.string().nullable(),
  close: z.string().nullable(),
  closesNextDay: z.boolean(),
});

export const adminHoursListResponseSchema = z.object({ hours: z.array(adminHoursSchema) });
export const adminHoursDayResponseSchema = z.object({ hours: adminHoursSchema });

export const publicHoursSchema = z.object({
  day: z.number().int().min(1).max(7),
  label: z.string().trim().min(1).max(20),
  open: z.string().nullable(),
  close: z.string().nullable(),
  closesNextDay: z.boolean(),
});

export const publicContactsSchema = z.object({
  phone: z.string().trim().min(1),
  phoneHref: z.string().trim().min(1),
  email: z.string().trim().min(1),
  emailHref: z.string().trim().min(1),
  address: z.string().trim().min(1),
  addressShort: z.string().trim().min(1),
  mapsUrl: z.string().trim().min(1),
  mapsEmbedQuery: z.string().trim().min(1),
  latitude: z.number(),
  longitude: z.number(),
});

export const settingsResponseSchema = z.object({
  name: z.string().trim().min(1),
  tagline: z.string().trim().min(1),
  description: z.string().trim().min(1),
  ageRestriction: z.string().trim().min(1),
  contacts: publicContactsSchema,
  socials: z.array(publicSocialSchema),
  hours: z.array(publicHoursSchema),
});

export type SiteSettingsInput = z.output<typeof siteSettingsFormSchema>;
export type SiteSettingsPatch = z.output<typeof siteSettingsPatchSchema>;
export type AdminSiteSettings = z.output<typeof adminSiteSettingsSchema>;

export type SocialInput = z.output<typeof socialFormSchema>;
export type SocialPatch = z.output<typeof socialPatchSchema>;
export type AdminSocial = z.output<typeof adminSocialSchema>;

export type HoursInput = z.output<typeof hoursFormSchema>;
export type AdminHours = z.output<typeof adminHoursSchema>;

export type PublicSettings = z.output<typeof settingsResponseSchema>;
export type PublicSocial = z.output<typeof publicSocialSchema>;
export type PublicHours = z.output<typeof publicHoursSchema>;
