import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route";
import { deleteSocial, updateSocial } from "@/lib/admin";
import { socialPatchSchema } from "@/schemas/settings";

/** `PATCH` edits a social link, `DELETE` removes it. */

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const PATCH = async (request: Request, { params }: Context) =>
  adminRoute(async () => {
    const { id } = await params;
    const patch = parseBody(socialPatchSchema, await readJsonBody(request));

    return updateSocial(id, patch);
  });

export const DELETE = async (_request: Request, { params }: Context) =>
  adminRoute(async () => {
    const { id } = await params;

    await deleteSocial(id);

    return null;
  });
