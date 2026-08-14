import Link from "next/link";
import { site } from "@/data/site";
import { Logo, IconInstagram, IconTelegram, IconTiktok } from "@/components/ui/icon";
import { Beam } from "@/components/ui/Beam";
import styles from "./Footer.module.css";

const socialIcons = {
  Instagram: IconInstagram,
  Telegram: IconTelegram,
  TikTok: IconTiktok,
} as const;

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className="container">
        <Beam />

        <div className={styles.top}>
          <div className={styles.brandCol}>
            <Link href="/" aria-label={`${site.name} — на головну`}>
              <Logo className={styles.logo} />
            </Link>
            <p className={styles.tagline}>{site.description}</p>
            <span className={styles.badge}>Вхід виключно · {site.ageRestriction}</span>
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
                  <a href={site.contacts.phoneHref}>{site.contacts.phone}</a>
                </li>
                <li>
                  <a href={site.contacts.emailHref}>{site.contacts.email}</a>
                </li>
                <li>
                  <address>{site.contacts.address}</address>
                </li>
              </ul>
            </div>

            <div className={styles.col}>
              <h3>Ми в соцмережах</h3>
              <div className={styles.socials}>
                {site.socials.map((social) => {
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
            © {year} {site.name}. Всі права захищені.
          </span>
          <div className={styles.bottomLinks}>
            <Link href="/menu">Меню</Link>
            <a href={site.contacts.mapsUrl} target="_blank" rel="noreferrer noopener">
              Як нас знайти
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
