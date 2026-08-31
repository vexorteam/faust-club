import { createSocial } from "@/lib/admin"
import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route"
import { socialFormSchema } from "@/schemas/settings"

/** `POST /api/admin/settings/socials` — a new entry in the footer's social row. */

export const dynamic = "force-dynamic"

export const POST = async (request: Request) =>
  adminRoute(async () => {
    const input = parseBody(socialFormSchema, await readJsonBody(request))

    return createSocial(input)
  })
