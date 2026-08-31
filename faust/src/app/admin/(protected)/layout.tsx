import type { ReactNode } from "react"

import { AdminHeader } from "@/components/admin/AdminHeader"
import { AdminNav } from "@/components/admin/AdminNav"
import { ToastProvider } from "@/components/admin/Toast"
import { requireAdminOrRedirect } from "@/lib/session"
import { getSiteSettings } from "@/lib/settings"
import styles from "./layout.module.css"

export const dynamic = "force-dynamic"

const ProtectedLayout = async ({ children }: { children: ReactNode }) => {
  const user = await requireAdminOrRedirect()
  const settings = await getSiteSettings()

  return (
    <>
      <AdminHeader
        user={user}
        clubName={settings.name}
      />
      <main
        id='main'
        className={styles.content}
      >
        <ToastProvider>
          <AdminNav />
          {children}
        </ToastProvider>
      </main>
    </>
  )
}

export default ProtectedLayout
