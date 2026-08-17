import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route";
import { createItem } from "@/lib/admin";
import { menuItemFormSchema } from "@/schemas/menu-item";

/** `POST /api/admin/items` — publishes a new position straight to the showcase. */

export const dynamic = "force-dynamic";

export const POST = async (request: Request) =>
  adminRoute(async () => {
    const input = parseBody(menuItemFormSchema, await readJsonBody(request));

    return createItem(input);
  });
