import { adminRoute, readUpload, takeFile, takeText } from "@/lib/admin-route";
import { createAtmospherePhoto } from "@/lib/admin";
import { imageAltSchema } from "@/schemas/image";
import { atmosphereFormSchema } from "@/schemas/atmosphere";

/**
 * `POST /api/admin/atmosphere` — a new tile of the home page grid.
 *
 * Caption, description and file arrive in one multipart request, because a tile
 * without a picture does not exist (§5.2) and creating an empty one first would
 * leave a hole on the home page until the upload finished.
 */

export const dynamic = "force-dynamic";

const labelSchema = atmosphereFormSchema.shape.label;

export const POST = async (request: Request) =>
  adminRoute(async () => {
    const form = await readUpload(request);
    const file = takeFile(form);
    const label = takeText(form, "label", labelSchema);
    const alt = takeText(form, "alt", imageAltSchema);

    return createAtmospherePhoto(file, label, alt);
  });
