import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

const sitemap = (): MetadataRoute.Sitemap => {
  const lastModified = new Date();

  return [
    { url: siteUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/menu`, lastModified, changeFrequency: "weekly", priority: 0.8 },
  ];
};

export default sitemap;
