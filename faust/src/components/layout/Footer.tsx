import Link from "next/link";
import { site } from "@/data/site";
import { Logo, IconInstagram, IconTelegram, IconTiktok } from "@/components/ui/icon";
import { Beam } from "@/components/ui/Beam";
import type { SiteSettingsView } from "@/types";
import styles from "./Footer.module.css";

const socialIcons = {
  Instagram: IconInstagram,
  Telegram: IconTelegram,
  TikTok: IconTiktok,
} as const;

export const Footer = ({ settings }: { settings: SiteSettingsView }) => {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className="container">
        <Beam />

        <div className={styles.top}>
          <div className={styles.brandCol}>
            <Link href="/" aria-label={`${settings.name} — на головну`}>
              <Logo className={styles.logo} />
            </Link>
            <p className={styles.tagline}>{settings.description}</p>
            <span className={styles.badge}>Вхід виключно · {settings.ageRestriction}</span>
          </div>

          <div className={styles.cols}>
            <div className={styles.col}>
              <h3>Навігація</h3>
              <ul>
                {site.nav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.col}>
              <h3>Контакти</h3>
              <ul>
                <li>
                  <a href={settings.contacts.phoneHref}>{settings.contacts.phone}</a>
                </li>
                <li>
                  <a href={settings.contacts.emailHref}>{settings.contacts.email}</a>
                </li>
                <li>
                  <address>{settings.contacts.address}</address>
                </li>
              </ul>
            </div>

            <div className={styles.col}>
              <h3>Ми в соцмережах</h3>
              <div className={styles.socials}>
                {settings.socials.map((social) => {
                  const Icon = socialIcons[social.name as keyof typeof socialIcons];
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={social.name}
                    >
                      {Icon && <Icon />}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <span>
            © {year} {settings.name}. Всі права захищені.
          </span>

          <div className={styles.bottomLinks}>
            <Link href="/menu">Меню</Link>

            <a href={settings.contacts.mapsUrl} target="_blank" rel="noreferrer noopener">
              Як нас знайти
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
