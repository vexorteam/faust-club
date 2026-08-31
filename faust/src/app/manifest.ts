import type { MetadataRoute } from "next"

import { site } from "@/data/site"
import { getSiteSettings } from "@/lib/settings"

const manifest = async (): Promise<MetadataRoute.Manifest> => {
  const settings = await getSiteSettings()

  return {
    name: `${settings.name} — ${settings.tagline}`,
    short_name: settings.name,
    description: settings.description,
    start_url: "/",
    display: "standalone",
    background_color: site.themeColor,
    theme_color: site.themeColor,
    lang: "uk",
  }
}

export default manifest
