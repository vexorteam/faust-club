"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./not-found.module.css";

const PublicError = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
  useEffect(() => {
    console.error("[site] the page could not be rendered", error);
  }, [error]);

  return (
    <section className={styles.section}>
      <div className={`container ${styles.grid}`}>
        <span className={styles.code}>Ой</span>
        <h1 className={styles.title}>Сторінка не завантажилась</h1>
        <p className={styles.text}>
          Щось зламалось на нашому боці — не у вас. Спробуйте ще раз за хвилину, а якщо поспішаєте, двері клубу
          відчиняються за розкладом і без сайту.
        </p>
        <div className={styles.actions}>
          <Button type="button" variant="primary" onClick={reset}>
            Спробувати ще раз
          </Button>
          <Button href="/" variant="ghost">
            На головну
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PublicError;
