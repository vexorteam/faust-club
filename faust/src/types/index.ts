/**
 * Public shape of the showcase data, as it reaches the components.
 *
 * Kept structurally compatible with the static `MenuItem` / `MenuCategory`
 * from `data/menu.ts`: every extra field is optional, so `MenuSections`
 * renders both the API payload and the static fallback without a single edit.
 */

export type MenuItemBadge = "new" | "hit";

export type MenuItemView = {
  id: string;
  name: string;
  /** Composition: "джин, лайм, тонік, розмарин" */
  description: string;
  /** Whole hryvnias, never a string and never with kopecks */
  price: number;
  /** Absolute URL served by the media host */
  image?: string;
  imageAlt?: string;
  volume?: string;
  badge?: MenuItemBadge | null;
  /** Missing means available */
  available?: boolean;
};

export type MenuCategoryView = {
  /** Stable, URL-safe: this is the `#signature` anchor */
  slug: string;
  label: string;
  note?: string | null;
  items: MenuItemView[];
};

/** One tile of the "Атмосфера" grid, as the home page receives it. */
export type AtmospherePhotoView = {
  id: string;
  /** Caption a visitor reads on the tile */
  label: string;
  /** Absolute URL served by the media host */
  image: string;
  /** What a screen reader says instead of the picture — never the caption again */
  imageAlt: string;
};

/** Whoever is signed in to the admin area, as the API describes them. */
export type AdminUser = {
  id: string;
  name: string;
  email: string;
};
