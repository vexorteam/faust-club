import { site } from "@/data/site";

/**
 * The origin this deployment actually answers on.
 *
 * `data/site.ts` carries the club's own address, which is right in production
 * and wrong everywhere else: canonical links, OG images, the sitemap and the
 * JSON-LD of a staging or local stack would all claim to be faust.bar.
 * `NEXT_PUBLIC_SITE_URL` is what `docker-compose.yml` already sets per
 * deployment — until now nothing read it.
 *
 * Public on purpose: it is a public address, and it is baked in at build time
 * like every `NEXT_PUBLIC_*` value, which is exactly when the metadata that
 * uses it is generated.
 */
const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

const withoutTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

export const siteUrl = withoutTrailingSlash(configured || site.url);
