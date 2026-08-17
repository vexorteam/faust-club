import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route";
import { moveAtmospherePhoto } from "@/lib/admin";
import { moveSchema } from "@/schemas/category";

/** `POST /api/admin/atmosphere/{id}/move` — order of the tiles on the home page. */

export const dynamic = "force-dynamic";

export const POST = async (request: Request, { params }: { params: Promise<{ id: string }> }) =>
  adminRoute(async () => {
    const { id } = await params;
    const { direction } = parseBody(moveSchema, await readJsonBody(request));

    await moveAtmospherePhoto(id, direction);

    return null;
  });
