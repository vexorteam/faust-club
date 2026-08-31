import type { Metadata } from "next"

import { AdminNotice } from "@/components/admin/AdminNotice"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { ItemForm } from "@/components/admin/ItemForm"
import { listCategories } from "@/lib/admin"
import { requireAdminOrRedirect } from "@/lib/session"

/** A new position appears on the showcase the moment it is published. */

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Нова позиція",
  robots: { index: false, follow: false, nocache: true },
}

const NewItemPage = async () => {
  await requireAdminOrRedirect()

  const categories = await listCategories()

  return (
    <section>
      <AdminPageHeader
        eyebrow='меню'
        title='Нова позиція'
        description='Опублікована позиція одразу видна гостям.'
      />

      {categories.length === 0 ? (
        <AdminNotice action={{ href: "/admin/categories", label: "До категорій" }}>
          Спочатку потрібна категорія — позиція без неї не має де зʼявитися в меню.
        </AdminNotice>
      ) : (
        <ItemForm categories={categories} />
      )}
    </section>
  )
}

export default NewItemPage
