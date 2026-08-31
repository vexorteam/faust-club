import { deleteItemImage, uploadItemImage } from "@/lib/admin"
import { adminRoute, readUpload, takeFile, takeText } from "@/lib/admin-route"
import { imageAltSchema } from "@/schemas/image"

/**
 * Photo of one position.
 *
 * `POST` carries the file and its description together: the API stores both in
 * one call, and a picture with no description would be invisible to anyone
 * using a screen reader. `DELETE` takes the photo away and leaves the position.
 */

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export const POST = async (request: Request, { params }: Context) =>
  adminRoute(async () => {
    const { id } = await params
    const form = await readUpload(request)
    const file = takeFile(form)
    const alt = takeText(form, "alt", imageAltSchema)

    return uploadItemImage(id, file, alt)
  })

export const DELETE = async (_request: Request, { params }: Context) =>
  adminRoute(async () => {
    const { id } = await params

    await deleteItemImage(id)

    return null
  })
