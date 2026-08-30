import Link from "next/link";
import type { AdminUser } from "@/types";
import { LogoutButton } from "./LogoutButton";
import styles from "./AdminHeader.module.css";

export const AdminHeader = ({ user, clubName }: { user: AdminUser; clubName: string }) => (
  <header className={styles.header}>
    <div className={styles.bar}>
      <Link href="/admin" className={styles.brand}>
        {clubName}
        <span className={styles.area}>керування</span>
      </Link>

      <div className={styles.session}>
        <span className={styles.user}>{user.name}</span>
        <LogoutButton />
      </div>
    </div>
  </header>
);
