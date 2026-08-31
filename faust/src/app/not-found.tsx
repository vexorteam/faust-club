import type { Metadata } from "next"

import { Button } from "@/components/ui/Button"
import styles from "./not-found.module.css"

export const metadata: Metadata = {
  title: "Такої сторінки немає",
  robots: { index: false, follow: false },
}

const NotFound = () => (
  <section className={styles.section}>
    <div className={`container ${styles.grid}`}>
      <span className={styles.code}>404</span>
      <h1 className={styles.title}>Такої сторінки немає. Є бар.</h1>
      <p className={styles.text}>
        Здається, ви загубились між танцполом і гардеробом. Поки шукаєте дорогу — загляньте в меню, там точно знайдеться
        щось до смаку.
      </p>
      <div className={styles.actions}>
        <Button
          href='/menu'
          variant='primary'
        >
          Перейти в меню
        </Button>
        <Button
          href='/'
          variant='ghost'
        >
          На головну
        </Button>
      </div>
    </div>
  </section>
)

export default NotFound
