import type { SiteSettingsView } from "@/types"

import { site } from "@/data/site"
import { apiRequest } from "@/lib/api"
import { settingsResponseSchema } from "@/schemas/settings"

const REVALIDATE_SECONDS = 3600

const fallback: SiteSettingsView = {
  name: site.name,
  tagline: site.tagline,
  description: site.description,
  ageRestriction: site.ageRestriction,
  contacts: {
    phone: site.contacts.phone,
    phoneHref: site.contacts.phoneHref,
    email: site.contacts.email,
    emailHref: site.contacts.emailHref,
    address: site.contacts.address,
    addressShort: site.contacts.addressShort,
    mapsUrl: site.contacts.mapsUrl,
    mapsEmbedQuery: site.contacts.mapsEmbedQuery,
    latitude: site.contacts.coordinates.lat,
    longitude: site.contacts.coordinates.lng,
  },
  socials: site.socials.map(social => ({ name: social.name, href: social.href, handle: social.handle })),
  hours: site.hours.map(rule => ({
    day: rule.day,
    label: rule.label,
    open: rule.open,
    close: rule.close,
    closesNextDay: rule.closesNextDay,
  })),
}

export const getSiteSettings = async (): Promise<SiteSettingsView> => {
  try {
    return await apiRequest("/api/v1/settings", settingsResponseSchema, {
      next: { tags: ["settings"], revalidate: REVALIDATE_SECONDS },
    })
  } catch (error) {
    console.error("[settings] the API did not deliver site settings, falling back", error)

    return fallback
  }
}
