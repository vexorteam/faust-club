import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./AdminNotice.module.css";

/**
 * An empty state or a nudge: says what is missing and what to press. Never just
 * "нічого немає" — a dead end is not an answer.
 */

export type AdminNoticeProps = {
  children: ReactNode;
  action?: { href: string; label: string };
};

export const AdminNotice = ({ children, action }: AdminNoticeProps) => (
  <div className={styles.notice}>
    <p className={styles.text}>{children}</p>

    {action && (
      <Link href={action.href} className={styles.action}>
        {action.label}
      </Link>
    )}
  </div>
);
