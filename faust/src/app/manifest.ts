import type { MetadataRoute } from "next";
import { site } from "@/data/site";

const manifest = (): MetadataRoute.Manifest => ({
  name: `${site.name} — ${site.tagline}`,
  short_name: site.name,
  description: site.description,
  start_url: "/",
  display: "standalone",
  background_color: site.themeColor,
  theme_color: site.themeColor,
  lang: "uk",
});

export default manifest;
