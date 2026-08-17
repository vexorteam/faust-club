"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminNav.module.css";

/**
 * Three sections, always visible: what the owner manages is the whole map of
 * this area, so it never hides behind a burger — not even on a phone.
 */

const SECTIONS = [
  { href: "/admin", label: "Позиції", owns: ["/admin", "/admin/items"] },
  { href: "/admin/categories", label: "Категорії", owns: ["/admin/categories"] },
  { href: "/admin/atmosphere", label: "Атмосфера", owns: ["/admin/atmosphere"] },
] as const;

const isCurrent = (pathname: string, owns: readonly string[]) =>
  owns.some((base) => pathname === base || pathname.startsWith(`${base}/`));

export const AdminNav = () => {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Розділи керування">
      {SECTIONS.map((section) => {
        const current = isCurrent(pathname, section.owns);

        return (
          <Link
            key={section.href}
            href={section.href}
            className={current ? `${styles.link} ${styles.current}` : styles.link}
            aria-current={current ? "page" : undefined}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
};
