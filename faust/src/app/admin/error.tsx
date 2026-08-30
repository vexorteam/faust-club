"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./error.module.css";

const AdminError = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
  useEffect(() => {
    console.error("[admin] the page could not be rendered", error);
  }, [error]);

  return (
    <main id="main" className={styles.screen}>
      <div className={styles.card}>
        <span className="eyebrow">керування</span>
        <h1 className={styles.title}>Сервер не відповів</h1>
        <p className={styles.text}>
          Дані не завантажились — найімовірніше, бекенд зараз недоступний. Ваші зміни не втрачені: те, що вже було
          збережено, лишилось на сайті.
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.retry} onClick={reset}>
            Спробувати ще раз
          </button>

          <Link href="/admin/login" className={styles.link}>
            Увійти знову
          </Link>
        </div>
      </div>
    </main>
  );
};

export default AdminError;
