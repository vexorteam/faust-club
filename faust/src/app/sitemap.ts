import type { MetadataRoute } from "next";
import { site } from "@/data/site";

const sitemap = (): MetadataRoute.Sitemap => {
  const lastModified = new Date();

  return [
    { url: site.url, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/menu`, lastModified, changeFrequency: "weekly", priority: 0.8 },
  ];
};

export default sitemap;
