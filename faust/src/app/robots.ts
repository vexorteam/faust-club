import type { MetadataRoute } from "next";
import { site } from "@/data/site";

const robots = (): MetadataRoute.Robots => ({
  rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
  sitemap: `${site.url}/sitemap.xml`,
  host: site.url,
});

export default robots;
