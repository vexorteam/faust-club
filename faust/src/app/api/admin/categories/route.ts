import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route";
import { createCategory } from "@/lib/admin";
import { categoryFormSchema } from "@/schemas/category";

/**
 * `POST /api/admin/categories` — creates a category.
 *
 * The session check lives inside `createCategory()`, together with the request
 * itself: a route that forgets to guard is a route that leaks, so the guard is
 * not something the caller can skip.
 */

export const dynamic = "force-dynamic";

export const POST = async (request: Request) =>
  adminRoute(async () => {
    const input = parseBody(categoryFormSchema, await readJsonBody(request));

    return createCategory(input);
  });
