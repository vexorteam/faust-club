import { moveCategory } from "@/lib/admin"
import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route"
import { moveSchema } from "@/schemas/category"

/**
 * `POST /api/admin/categories/{id}/move` — one step up or down.
 *
 * There is no "save order" button anywhere in the admin area: the new order is
 * the fact, and it is stored the moment the arrow is pressed.
 */

export const dynamic = "force-dynamic"

export const POST = async (request: Request, { params }: { params: Promise<{ id: string }> }) =>
  adminRoute(async () => {
    const { id } = await params
    const { direction } = parseBody(moveSchema, await readJsonBody(request))

    await moveCategory(id, direction)

    return null
  })
