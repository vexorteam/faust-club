import type { Metadata } from "next";
import { site } from "@/data/site";
import { LoginForm } from "@/components/admin/LoginForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вхід",
  robots: { index: false, follow: false, nocache: true },
};

const LoginPage = () => (
  <main id="main" className={styles.screen}>
    <div className={styles.card}>
      <span className="eyebrow">{site.name} · керування</span>
      <h1 className={styles.title}>Вхід</h1>
      <p className={styles.hint}>Сторінка для персоналу клубу. Меню й фото редагуються звідси.</p>

      <LoginForm />
    </div>
  </main>
);

export default LoginPage;
