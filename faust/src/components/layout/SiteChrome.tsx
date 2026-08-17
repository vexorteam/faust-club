"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Decides who gets the club's chrome.
 *
 * The admin area is a different territory: no site header, no footer, no
 * atmosphere — it brings its own shell and its own `<main>`. Header and footer
 * arrive as rendered props, so they stay server components.
 */
export const SiteChrome = ({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) => {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return <>{children}</>;

  return (
    <>
      {header}
      <main id="main">{children}</main>
      {footer}
    </>
  );
};
