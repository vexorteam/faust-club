"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./not-found.module.css";

/**
 * Error boundary of the public pages.
 *
 * Almost the only thing that can land here is the API failing in a way
 * `getMenu()` does not swallow — it already degrades to an empty state on its
 * own. What is left is worth a page in the club's voice rather than a white
 * screen: nothing the visitor did is broken, and the bar is still open.
 *
 * It borrows the 404 layout on purpose. The two are the same page with a
 * different sentence, and a second stylesheet saying the same thing is a second
 * stylesheet to keep in step.
 */
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
