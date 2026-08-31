import { moveSocial } from "@/lib/admin"
import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route"
import { moveSchema } from "@/schemas/category"

export const dynamic = "force-dynamic"

export const POST = async (request: Request, { params }: { params: Promise<{ id: string }> }) =>
  adminRoute(async () => {
    const { id } = await params
    const { direction } = parseBody(moveSchema, await readJsonBody(request))

    await moveSocial(id, direction)

    return null
  })
