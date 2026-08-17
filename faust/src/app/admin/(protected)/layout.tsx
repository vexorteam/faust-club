import type { ReactNode } from "react";
import { requireAdminOrRedirect } from "@/lib/session";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { ToastProvider } from "@/components/admin/Toast";
import styles from "./layout.module.css";

/**
 * Everything behind the login form.
 *
 * A missing or expired token means a quiet redirect to the login page — not a
 * white screen. Anything else (a backend that is down, for instance) is a real
 * failure and travels up: pretending the owner is signed out would be a lie.
 *
 * This check is not the security boundary. Pages under here repeat it, and the
 * API repeats it again on every request (§3.5).
 */

export const dynamic = "force-dynamic";

const ProtectedLayout = async ({ children }: { children: ReactNode }) => {
  const user = await requireAdminOrRedirect();

  return (
    <>
      <AdminHeader user={user} />
      <main id="main" className={styles.content}>
        <ToastProvider>
          <AdminNav />
          {children}
        </ToastProvider>
      </main>
    </>
  );
};

export default ProtectedLayout;
