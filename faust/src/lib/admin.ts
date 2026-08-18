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

/**
 * Every admin endpoint of the Python API (§5.3.1), one function each.
 *
 * Transport still belongs to `lib/api.ts` — this module only knows which paths
 * exist, which schema each answer matches and that every call needs a live
 * session. Server Components call these directly for reads; writes come in
 * through the route handlers under `app/api/admin/*`, because only a route
 * handler is allowed to touch cookies.
 *
 * Nothing here triggers revalidation: the API fires the webhook itself after
 * every change (§5.3), and a second source of invalidation would only race
 * with the first.
 */

const ADMIN_PATH = "/api/v1/admin";

const EXPIRED_MESSAGE = "Сесія завершилась. Увійдіть ще раз";

/**
 * A photo taken on a phone is megabytes over a bar's uplink, and the API still
 * has to rotate and re-encode it. The eight seconds the rest of the endpoints
 * get would report a failure while the upload is still going fine.
 */
const UPLOAD_TIMEOUT_MS = 30000;

/** Answers that carry nothing worth reading: DELETE and the move endpoints. */
const acknowledgedSchema = z.unknown();

/**
 * Guard in front of every call. `requireAdmin()` is what makes the check real —
 * it asks the API whether the token is still alive instead of trusting the
 * cookie's existence.
 */
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

/* ── Categories ─────────────────────────────────────────────────────────── */

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

/**
 * The API refuses to delete a category that still holds items. Its own wording
 * is generic, so the count is looked up here and the owner is told what to do
 * about it — which items, and how many.
 */
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

/** At the edge of the list the API answers 200 and changes nothing (§5.3.1). */
export const moveCategory = async (id: string, direction: MoveDirection): Promise<void> => {
  await adminRequest(`/categories/${id}/move`, acknowledgedSchema, {
    method: "POST",
    body: { direction },
  });
};

/* ── Menu items ─────────────────────────────────────────────────────────── */

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

/**
 * Photo of a position. The API stores the file, strips its metadata, rotates it
 * by EXIF and answers with the ready URL — the frontend never learns the key.
 * The description travels with the picture, because the two are only useful
 * together (§5.3.1).
 */
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

/* ── Atmosphere photos ──────────────────────────────────────────────────── */

export const listAtmospherePhotos = async (): Promise<AtmospherePhoto[]> => {
  const { photos } = await adminRequest("/atmosphere", adminAtmosphereResponseSchema);

  return photos;
};

/**
 * There is no single-photo endpoint in the contract, and inventing one just to
 * fill an edit form would put the frontend ahead of the backend. The list is
 * short — it is cheaper to read it and pick.
 */
export const findAtmospherePhoto = async (id: string): Promise<AtmospherePhoto | null> => {
  const photos = await listAtmospherePhotos();

  return photos.find((photo) => photo.id === id) ?? null;
};

/**
 * A tile is born with its picture: `POST /admin/atmosphere` takes the file, the
 * caption and the screen-reader description in one multipart request, because a
 * tile without a photo is nothing to show (§5.2).
 */
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
