import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route";
import { updateSiteSettings } from "@/lib/admin";
import { siteSettingsPatchSchema } from "@/schemas/settings";

/** `PATCH /api/admin/settings` — the club's own facts, all in one form. */

export const dynamic = "force-dynamic";

export const PATCH = async (request: Request) =>
  adminRoute(async () => {
    const patch = parseBody(siteSettingsPatchSchema, await readJsonBody(request));

    return updateSiteSettings(patch);
  });
