import { deleteCategory, updateCategory } from "@/lib/admin"
import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route"
import { categoryPatchSchema } from "@/schemas/category"

/** `PATCH` renames or hides a category, `DELETE` removes an empty one. */

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export const PATCH = async (request: Request, { params }: Context) =>
  adminRoute(async () => {
    const { id } = await params
    const patch = parseBody(categoryPatchSchema, await readJsonBody(request))

    return updateCategory(id, patch)
  })

export const DELETE = async (_request: Request, { params }: Context) =>
  adminRoute(async () => {
    const { id } = await params

    await deleteCategory(id)

    return null
  })
