import type { Metadata } from "next"
import type { ReactNode } from "react"

import styles from "./layout.module.css"

/**
 * Outer shell of the admin area: the part that also has to wrap the login
 * page, so it carries no session check of its own. Guarding lives one level
 * deeper, in `(protected)/layout.tsx`.
 *
 * Nothing under `/admin` is ever cached: every page renders against the
 * session it was asked with.
 */

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Керування",
  robots: { index: false, follow: false, nocache: true },
}

const AdminLayout = ({ children }: { children: ReactNode }) => <div className={styles.shell}>{children}</div>

export default AdminLayout
