"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminNav.module.css";

/**
 * Three sections, always visible: what the owner manages is the whole map of
 * this area, so it never hides behind a burger — not even on a phone.
 */

const SECTIONS = [
  /**
   * `owns` is the list of prefixes a section answers for, and the list of
   * positions has one that its own address is not: it lives at the root of the
   * panel, so treating `/admin` as a prefix would mark it current on every page
   * in the area — two tabs highlighted at once, and `aria-current` on both.
   */
  { href: "/admin", label: "Позиції", owns: ["/admin/items"] },
  { href: "/admin/categories", label: "Категорії", owns: ["/admin/categories"] },
  { href: "/admin/atmosphere", label: "Атмосфера", owns: ["/admin/atmosphere"] },
  { href: "/admin/testimonials", label: "Відгуки", owns: ["/admin/testimonials"] },
  { href: "/admin/settings", label: "Налаштування", owns: ["/admin/settings"] },
] as const;

const isCurrent = (pathname: string, href: string, owns: readonly string[]) =>
  pathname === href || owns.some((base) => pathname === base || pathname.startsWith(`${base}/`));

export const AdminNav = () => {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Розділи керування">
      {SECTIONS.map((section) => {
        const current = isCurrent(pathname, section.href, section.owns);

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
