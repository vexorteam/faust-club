import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route";
import { moveItem } from "@/lib/admin";
import { moveSchema } from "@/schemas/category";

/** `POST /api/admin/items/{id}/move` — order inside the item's own category. */

export const dynamic = "force-dynamic";

export const POST = async (request: Request, { params }: { params: Promise<{ id: string }> }) =>
  adminRoute(async () => {
    const { id } = await params;
    const { direction } = parseBody(moveSchema, await readJsonBody(request));

    await moveItem(id, direction);

    return null;
  });
