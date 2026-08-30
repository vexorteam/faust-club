import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route";
import { updateHours } from "@/lib/admin";
import { hoursPatchSchema } from "@/schemas/settings";

/**
 * `PATCH /api/admin/settings/hours/{day}` — one weekday's open/close times.
 *
 * There is no create or delete here: the week always has exactly seven days,
 * seeded once and never added to or removed from.
 */

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ day: string }> };

export const PATCH = async (request: Request, { params }: Context) =>
  adminRoute(async () => {
    const { day } = await params;
    const patch = parseBody(hoursPatchSchema, await readJsonBody(request));

    return updateHours(Number(day), patch);
  });
