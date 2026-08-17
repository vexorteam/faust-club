import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route";
import { deleteItem, updateItem } from "@/lib/admin";
import { menuItemPatchSchema } from "@/schemas/menu-item";

/**
 * `PATCH` covers both the whole edit form and the single-field switches in the
 * list — flipping "Є / Немає" is the same call with one key in the body, which
 * is why the schema takes any subset. A changed `categoryId` moves the item to
 * another category.
 */

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const PATCH = async (request: Request, { params }: Context) =>
  adminRoute(async () => {
    const { id } = await params;
    const patch = parseBody(menuItemPatchSchema, await readJsonBody(request));

    return updateItem(id, patch);
  });

export const DELETE = async (_request: Request, { params }: Context) =>
  adminRoute(async () => {
    const { id } = await params;

    await deleteItem(id);

    return null;
  });
