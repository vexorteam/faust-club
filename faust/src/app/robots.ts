import type { MetadataRoute } from "next"

import { siteUrl } from "@/lib/site-url"

const robots = (): MetadataRoute.Robots => ({
  rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
  sitemap: `${siteUrl}/sitemap.xml`,
  host: siteUrl,
})

export default robots
