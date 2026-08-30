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

/** One social profile the footer links to, as the public feed sends it. */
export type SocialLinkView = {
  name: string;
  href: string;
  handle: string;
};

/** One weekday of the club's schedule. `open`/`close` both null means closed. */
export type OperatingHoursView = {
  day: number;
  label: string;
  open: string | null;
  close: string | null;
  /** True when `close` falls on the calendar day after `day` — Friday 22:00→04:00. */
  closesNextDay: boolean;
};

/**
 * The club's own facts as `GET /api/v1/settings` answers, and as the static
 * fallback in `data/site.ts` mirrors: name, contacts, socials, weekly hours.
 */
export type SiteSettingsView = {
  name: string;
  tagline: string;
  description: string;
  ageRestriction: string;
  contacts: {
    phone: string;
    phoneHref: string;
    email: string;
    emailHref: string;
    address: string;
    addressShort: string;
    mapsUrl: string;
    mapsEmbedQuery: string;
    latitude: number;
    longitude: number;
  };
  socials: SocialLinkView[];
  hours: OperatingHoursView[];
};

/** One review card of the "Відгуки" grid, as the public feed sends it. */
export type TestimonialView = {
  id: string;
  text: string;
  name: string;
  meta: string;
};
