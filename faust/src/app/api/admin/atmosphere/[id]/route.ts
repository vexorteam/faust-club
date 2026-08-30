import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route";
import { deleteAtmospherePhoto, updateAtmospherePhoto } from "@/lib/admin";
import { atmospherePatchSchema } from "@/schemas/atmosphere";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const PATCH = async (request: Request, { params }: Context) =>
  adminRoute(async () => {
    const { id } = await params;
    const patch = parseBody(atmospherePatchSchema, await readJsonBody(request));

    return updateAtmospherePhoto(id, patch);
  });

export const DELETE = async (_request: Request, { params }: Context) =>
  adminRoute(async () => {
    const { id } = await params;

    await deleteAtmospherePhoto(id);

    return null;
  });
