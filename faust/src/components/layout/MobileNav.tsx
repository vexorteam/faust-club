"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { site } from "@/data/site";
import { Logo, IconClose, IconInstagram, IconTelegram, IconTiktok } from "@/components/ui/icon";
import type { SiteSettingsView } from "@/types";
import styles from "./MobileNav.module.css";

const socialIcons = {
  Instagram: IconInstagram,
  Telegram: IconTelegram,
  TikTok: IconTiktok,
} as const;

type MobileNavProps = {
  open: boolean;
  onClose: () => void;
  pathname: string;
  settings: SiteSettingsView;
};

export const MobileNav = ({ open, onClose, pathname, settings }: MobileNavProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
      const originalOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      closeButtonRef.current?.focus();

      return () => {
        document.documentElement.style.overflow = originalOverflow;
        triggerRef.current?.focus();
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      id="mobile-nav"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Меню навігації"
      className={styles.overlay}
    >
      <div className={styles.top}>
        <Logo className={styles.logo} />
        <button ref={closeButtonRef} type="button" className={styles.close} aria-label="Закрити меню" onClick={onClose}>
          <IconClose />
        </button>
      </div>

      <nav className={styles.list} aria-label="Основна навігація">
        {site.nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={styles.link}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <span className={styles.contactLine}>
          <a href={settings.contacts.phoneHref}>{settings.contacts.phone}</a>
        </span>
        <span className={styles.contactLine}>{settings.contacts.addressShort}</span>
        <div className={styles.socials}>
          {settings.socials.map((social) => {
            const Icon = socialIcons[social.name as keyof typeof socialIcons];
            return (
              <a key={social.name} href={social.href} target="_blank" rel="noreferrer noopener" aria-label={social.name}>
                {Icon && <Icon />}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
};
