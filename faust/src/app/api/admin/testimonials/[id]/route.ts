import { deleteTestimonial, updateTestimonial } from "@/lib/admin"
import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route"
import { testimonialPatchSchema } from "@/schemas/testimonial"

/** `PATCH` edits a review card (including hiding it), `DELETE` removes it. */

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export const PATCH = async (request: Request, { params }: Context) =>
  adminRoute(async () => {
    const { id } = await params
    const patch = parseBody(testimonialPatchSchema, await readJsonBody(request))

    return updateTestimonial(id, patch)
  })

export const DELETE = async (_request: Request, { params }: Context) =>
  adminRoute(async () => {
    const { id } = await params

    await deleteTestimonial(id)

    return null
  })
