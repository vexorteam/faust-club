import Link from "next/link";
import { site } from "@/data/site";
import type { AdminUser } from "@/types";
import { LogoutButton } from "./LogoutButton";
import styles from "./AdminHeader.module.css";

export const AdminHeader = ({ user }: { user: AdminUser }) => (
  <header className={styles.header}>
    <div className={styles.bar}>
      <Link href="/admin" className={styles.brand}>
        {site.name}
        <span className={styles.area}>керування</span>
      </Link>

      <div className={styles.session}>
        <span className={styles.user}>{user.name}</span>
        <LogoutButton />
      </div>
    </div>
  </header>
);
