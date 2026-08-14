import { SectionTitle } from "@/components/ui/SectionTitle";
import { Reveal } from "@/components/layout/Reveal";
import { IconQuote } from "@/components/ui/icon";
import styles from "./Testimonials.module.css";

const testimonials = [
  {
    text: "Найкращий звук у місті — без перебільшень.",
    name: "Софія М.",
    meta: "гостя клубу",
  },
  {
    text: "Бар-команда — окрема причина повертатися. Коктейлі збалансовані, а не просто красиві на фото.",
    name: "Дмитро К.",
    meta: "постійний гість",
  },
  {
    text: "Забронювали віп-стіл на день народження — сервіс на рівні, персонал уважний, локація в самому центрі.",
    name: "Анна Т.",
    meta: "приватна подія",
  },
];

export const Testimonials = () => (
  <section id="reviews" className={styles.section} aria-labelledby="testimonials-heading">
    <div className="container">
      <Reveal>
        <SectionTitle id="testimonials-heading" eyebrow="Відгуки" title="Не вірте нам" accent="повірте гостям" />
      </Reveal>

      <div className={styles.grid}>
        {testimonials.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.07}>
            <figure className={styles.card}>
              <div className={styles.cardGlow} />
              <IconQuote className={styles.quoteIcon} />
              <blockquote className={styles.text}>{t.text}</blockquote>
              <figcaption className={styles.author}>
                <span className={styles.avatar} aria-hidden="true">
                  {t.name.charAt(0)}
                </span>
                <span>
                  <div className={styles.authorName}>{t.name}</div>
                  <div className={styles.authorMeta}>{t.meta}</div>
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);
