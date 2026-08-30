import { adminRoute, readUpload, takeFile, takeText } from "@/lib/admin-route";
import { createAtmospherePhoto } from "@/lib/admin";
import { imageAltSchema } from "@/schemas/image";
import { atmosphereFormSchema } from "@/schemas/atmosphere";

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
