import { site } from "@/data/site";

const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

const withoutTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

export const siteUrl = withoutTrailingSlash(configured || site.url);
