import { apiRequest } from "@/lib/api";
import { menuResponseSchema } from "@/schemas/menu";
import type { MenuCategoryView } from "@/types";

const REVALIDATE_SECONDS = 3600;

/**
 * With no backend around the club must not lose its site: in production the
 * page falls back to an empty state, in development to the static sample menu
 * so there is something to work against.
 */
const getFallbackMenu = async (): Promise<MenuCategoryView[]> => {
  if (process.env.NODE_ENV === "production") return [];

  const { menu } = await import("@/data/menu");

  return menu;
};

export const getMenu = async (): Promise<MenuCategoryView[]> => {
  try {
    return await apiRequest("/api/v1/menu", menuResponseSchema, {
      next: { tags: ["menu"], revalidate: REVALIDATE_SECONDS },
    });
  } catch (error) {
    console.error("[menu] the API did not deliver the menu, falling back", error);

    return getFallbackMenu();
  }
};
