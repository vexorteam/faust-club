import type { Metadata } from "next"

import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AtmosphereCreateForm } from "@/components/admin/AtmosphereCreateForm"
import { requireAdminOrRedirect } from "@/lib/session"

/** A new tile for the grid on the home page. */

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Нове фото атмосфери",
  robots: { index: false, follow: false, nocache: true },
}

const NewAtmospherePage = async () => {
  await requireAdminOrRedirect()

  return (
    <section>
      <AdminPageHeader
        eyebrow='головна'
        title='Нове фото'
        description='Плитка зʼявиться останньою в сітці — порядок міняється стрілками у списку.'
      />

      <AtmosphereCreateForm />
    </section>
  )
}

export default NewAtmospherePage
