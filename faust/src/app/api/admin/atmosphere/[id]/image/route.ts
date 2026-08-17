import { adminRoute, readUpload, takeFile, takeText } from "@/lib/admin-route";
import { replaceAtmosphereImage } from "@/lib/admin";
import { imageAltSchema } from "@/schemas/image";

/**
 * `POST /api/admin/atmosphere/{id}/image` — a new picture for an existing tile.
 *
 * There is no `DELETE` counterpart on purpose: a tile is its photo, so removing
 * the picture means removing the tile.
 */

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const POST = async (request: Request, { params }: Context) =>
  adminRoute(async () => {
    const { id } = await params;
    const form = await readUpload(request);
    const file = takeFile(form);
    const alt = takeText(form, "alt", imageAltSchema);

    return replaceAtmosphereImage(id, file, alt);
  });
