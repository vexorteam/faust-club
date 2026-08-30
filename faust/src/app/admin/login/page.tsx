import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import { LoginForm } from "@/components/admin/LoginForm";
import { redirectIfSignedIn } from "@/lib/session";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вхід",
  robots: { index: false, follow: false, nocache: true },
};

const LoginPage = async () => {
  // A live session belongs in the panel, not on this form. Checked here rather
  // than in `proxy.ts`, which can only see that a cookie exists — see there.
  await redirectIfSignedIn();

  const settings = await getSiteSettings();

  return (
    <main id="main" className={styles.screen}>
      <div className={styles.card}>
        <span className="eyebrow">{settings.name} · керування</span>
        <h1 className={styles.title}>Вхід</h1>
        <p className={styles.hint}>Сторінка для персоналу клубу. Меню й фото редагуються звідси.</p>

        <LoginForm />
      </div>
    </main>
  );
};

export default LoginPage;
