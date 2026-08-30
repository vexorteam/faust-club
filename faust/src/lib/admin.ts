import { z } from "zod";
import { apiRequest, type ApiRequestOptions, type SessionRenewal } from "@/lib/api";
import { applySessionRenewal, readSessionToken, requireAdmin } from "@/lib/session";
import { CategoryNotEmptyError, UnauthorizedError } from "@/errors";
import {
  adminCategoriesResponseSchema,
  adminCategoryResponseSchema,
  type AdminCategory,
  type CategoryInput,
  type CategoryPatch,
  type MoveDirection,
} from "@/schemas/category";
import {
  adminItemResponseSchema,
  adminItemsResponseSchema,
  itemImageResponseSchema,
  type AdminItemGroup,
  type AdminMenuItem,
  type ItemImage,
  type MenuItemInput,
  type MenuItemPatch,
} from "@/schemas/menu-item";
import {
  adminAtmosphereResponseSchema,
  adminAtmospherePhotoResponseSchema,
  type AtmospherePatch,
  type AtmospherePhoto,
} from "@/schemas/atmosphere";
import {
  adminHoursDayResponseSchema,
  adminHoursListResponseSchema,
  adminSocialResponseSchema,
  adminSocialsResponseSchema,
  siteSettingsResponseSchema,
  type AdminHours,
  type AdminSiteSettings,
  type AdminSocial,
  type HoursInput,
  type SiteSettingsPatch,
  type SocialInput,
  type SocialPatch,
} from "@/schemas/settings";
import {
  adminTestimonialResponseSchema,
  adminTestimonialsResponseSchema,
  type AdminTestimonial,
  type TestimonialInput,
  type TestimonialPatch,
} from "@/schemas/testimonial";

const ADMIN_PATH = "/api/v1/admin";

const EXPIRED_MESSAGE = "Сесія завершилась. Увійдіть ще раз";

const UPLOAD_TIMEOUT_MS = 30000;

/** Answers that carry nothing worth reading: DELETE and the move endpoints. */
const acknowledgedSchema = z.unknown();

const authorize = async (): Promise<string> => {
  await requireAdmin();

  const token = await readSessionToken();

  if (!token) throw new UnauthorizedError(EXPIRED_MESSAGE);

  return token;
};

/** Multipart body of an upload: the file plus the texts that come with it. */
const uploadBody = (file: File, fields: Record<string, string>): FormData => {
  const form = new FormData();

  form.set("file", file);

  for (const [name, value] of Object.entries(fields)) form.set(name, value);

  return form;
};

const adminRequest = async <T>(
  path: string,
  schema: z.ZodType<T>,
  options: Omit<ApiRequestOptions, "token" | "next" | "onRenewal"> = {},
): Promise<T> => {
  const token = await authorize();

  /** Per call, so two requests in flight can never hand each other a token. */
  const renewal: { current: SessionRenewal | null } = { current: null };

  const result = await apiRequest(`${ADMIN_PATH}${path}`, schema, {
    ...options,
    token,
    cache: "no-store",
    onRenewal: (fresh) => {
      renewal.current = fresh;
    },
  });

  await applySessionRenewal(renewal.current);

  return result;
};

export const listCategories = async (): Promise<AdminCategory[]> => {
  const { categories } = await adminRequest("/categories", adminCategoriesResponseSchema);

  return categories;
};

export const createCategory = async (input: CategoryInput): Promise<AdminCategory> => {
  const { category } = await adminRequest("/categories", adminCategoryResponseSchema, {
    method: "POST",
    body: input,
  });

  return category;
};

export const updateCategory = async (id: string, patch: CategoryPatch): Promise<AdminCategory> => {
  const { category } = await adminRequest(`/categories/${id}`, adminCategoryResponseSchema, {
    method: "PATCH",
    body: patch,
  });

  return category;
};

const explainNotEmpty = async (id: string, fallback: CategoryNotEmptyError): Promise<CategoryNotEmptyError> => {
  try {
    const categories = await listCategories();
    const category = categories.find((entry) => entry.id === id);

    return category ? CategoryNotEmptyError.forCategory(category.label, category.itemsCount) : fallback;
  } catch (error) {
    console.error("[admin] could not describe a non-empty category", error);

    return fallback;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    await adminRequest(`/categories/${id}`, acknowledgedSchema, { method: "DELETE" });
  } catch (error) {
    if (error instanceof CategoryNotEmptyError) throw await explainNotEmpty(id, error);

    throw error;
  }
};

export const moveCategory = async (id: string, direction: MoveDirection): Promise<void> => {
  await adminRequest(`/categories/${id}/move`, acknowledgedSchema, {
    method: "POST",
    body: { direction },
  });
};

export const listItemGroups = async (): Promise<AdminItemGroup[]> => {
  const { categories } = await adminRequest("/items", adminItemsResponseSchema);

  return categories;
};

export const getItem = async (id: string): Promise<AdminMenuItem> => {
  const { item } = await adminRequest(`/items/${id}`, adminItemResponseSchema);

  return item;
};

export const createItem = async (input: MenuItemInput): Promise<AdminMenuItem> => {
  const { item } = await adminRequest("/items", adminItemResponseSchema, {
    method: "POST",
    body: input,
  });

  return item;
};

export const updateItem = async (id: string, patch: MenuItemPatch): Promise<AdminMenuItem> => {
  const { item } = await adminRequest(`/items/${id}`, adminItemResponseSchema, {
    method: "PATCH",
    body: patch,
  });

  return item;
};

export const deleteItem = async (id: string): Promise<void> => {
  await adminRequest(`/items/${id}`, acknowledgedSchema, { method: "DELETE" });
};

export const moveItem = async (id: string, direction: MoveDirection): Promise<void> => {
  await adminRequest(`/items/${id}/move`, acknowledgedSchema, {
    method: "POST",
    body: { direction },
  });
};

export const uploadItemImage = async (id: string, file: File, alt: string): Promise<ItemImage> =>
  adminRequest(`/items/${id}/image`, itemImageResponseSchema, {
    method: "POST",
    body: uploadBody(file, { alt }),
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });

/** Removes the picture and its files; the position itself stays in the menu. */
export const deleteItemImage = async (id: string): Promise<void> => {
  await adminRequest(`/items/${id}/image`, acknowledgedSchema, { method: "DELETE" });
};

export const listAtmospherePhotos = async (): Promise<AtmospherePhoto[]> => {
  const { photos } = await adminRequest("/atmosphere", adminAtmosphereResponseSchema);

  return photos;
};

export const findAtmospherePhoto = async (id: string): Promise<AtmospherePhoto | null> => {
  const photos = await listAtmospherePhotos();

  return photos.find((photo) => photo.id === id) ?? null;
};

export const createAtmospherePhoto = async (file: File, label: string, alt: string): Promise<AtmospherePhoto> => {
  const { photo } = await adminRequest("/atmosphere", adminAtmospherePhotoResponseSchema, {
    method: "POST",
    body: uploadBody(file, { label, alt }),
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });

  return photo;
};

/** Swaps the picture of an existing tile; the API deletes the old files itself. */
export const replaceAtmosphereImage = async (id: string, file: File, alt: string): Promise<AtmospherePhoto> => {
  const { photo } = await adminRequest(`/atmosphere/${id}/image`, adminAtmospherePhotoResponseSchema, {
    method: "POST",
    body: uploadBody(file, { alt }),
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });

  return photo;
};

export const updateAtmospherePhoto = async (id: string, patch: AtmospherePatch): Promise<AtmospherePhoto> => {
  const { photo } = await adminRequest(`/atmosphere/${id}`, adminAtmospherePhotoResponseSchema, {
    method: "PATCH",
    body: patch,
  });

  return photo;
};

export const deleteAtmospherePhoto = async (id: string): Promise<void> => {
  await adminRequest(`/atmosphere/${id}`, acknowledgedSchema, { method: "DELETE" });
};

export const moveAtmospherePhoto = async (id: string, direction: MoveDirection): Promise<void> => {
  await adminRequest(`/atmosphere/${id}/move`, acknowledgedSchema, {
    method: "POST",
    body: { direction },
  });
};

export const getSiteSettingsAdmin = async (): Promise<AdminSiteSettings> => {
  const { settings } = await adminRequest("/settings", siteSettingsResponseSchema);

  return settings;
};

export const updateSiteSettings = async (patch: SiteSettingsPatch): Promise<AdminSiteSettings> => {
  const { settings } = await adminRequest("/settings", siteSettingsResponseSchema, {
    method: "PATCH",
    body: patch,
  });

  return settings;
};

export const listHours = async (): Promise<AdminHours[]> => {
  const { hours } = await adminRequest("/settings/hours", adminHoursListResponseSchema);

  return hours;
};

export const updateHours = async (day: number, patch: HoursInput): Promise<AdminHours> => {
  const { hours } = await adminRequest(`/settings/hours/${day}`, adminHoursDayResponseSchema, {
    method: "PATCH",
    body: patch,
  });

  return hours;
};

export const listSocials = async (): Promise<AdminSocial[]> => {
  const { socials } = await adminRequest("/settings/socials", adminSocialsResponseSchema);

  return socials;
};

export const createSocial = async (input: SocialInput): Promise<AdminSocial> => {
  const { social } = await adminRequest("/settings/socials", adminSocialResponseSchema, {
    method: "POST",
    body: input,
  });

  return social;
};

export const updateSocial = async (id: string, patch: SocialPatch): Promise<AdminSocial> => {
  const { social } = await adminRequest(`/settings/socials/${id}`, adminSocialResponseSchema, {
    method: "PATCH",
    body: patch,
  });

  return social;
};

export const deleteSocial = async (id: string): Promise<void> => {
  await adminRequest(`/settings/socials/${id}`, acknowledgedSchema, { method: "DELETE" });
};

export const moveSocial = async (id: string, direction: MoveDirection): Promise<void> => {
  await adminRequest(`/settings/socials/${id}/move`, acknowledgedSchema, {
    method: "POST",
    body: { direction },
  });
};

export const listTestimonials = async (): Promise<AdminTestimonial[]> => {
  const { testimonials } = await adminRequest("/testimonials", adminTestimonialsResponseSchema);

  return testimonials;
};

export const createTestimonial = async (input: TestimonialInput): Promise<AdminTestimonial> => {
  const { testimonial } = await adminRequest("/testimonials", adminTestimonialResponseSchema, {
    method: "POST",
    body: input,
  });

  return testimonial;
};

export const updateTestimonial = async (id: string, patch: TestimonialPatch): Promise<AdminTestimonial> => {
  const { testimonial } = await adminRequest(`/testimonials/${id}`, adminTestimonialResponseSchema, {
    method: "PATCH",
    body: patch,
  });

  return testimonial;
};

export const deleteTestimonial = async (id: string): Promise<void> => {
  await adminRequest(`/testimonials/${id}`, acknowledgedSchema, { method: "DELETE" });
};

export const moveTestimonial = async (id: string, direction: MoveDirection): Promise<void> => {
  await adminRequest(`/testimonials/${id}/move`, acknowledgedSchema, {
    method: "POST",
    body: { direction },
  });
};
