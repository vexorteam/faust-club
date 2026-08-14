import Link from "next/link";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Reveal } from "@/components/layout/Reveal";
import { IconGlassCocktail, IconSpark, IconMusic, IconChevronRight } from "@/components/ui/icon";
import styles from "./BarHighlights.module.css";

const highlights = [
  {
    icon: IconGlassCocktail,
    title: "Авторські коктейлі",
    text: "Сигнатурна карта від бар-команди Faust — балансуємо класику з несподіваними інгредієнтами.",
    tag: "180+ позицій",
  },
  {
    icon: IconSpark,
    title: "Шоти й міцне",
    text: "Швидкий старт для вечора: фірмові шоти, преміальний віскі, текіла та джин без компромісів.",
    tag: "Барна карта",
  },
  {
    icon: IconMusic,
    title: "Барна міксологія",
    text: "Експериментальні мікси, нестандартні поєднання інгредієнтів та справжнє мистецтво створення смаку.",
    tag: "Щодня",
  },
];

export const BarHighlights = () => (
  <section className={styles.section} aria-labelledby="highlights-heading">
    <div className="container">
      <div className={styles.head}>
        <Reveal>
          <SectionTitle id="highlights-heading" eyebrow="У барі" title="Що ми" accent="наливаємо" />
        </Reveal>
        <Reveal delay={0.05}>
          <Link href="/menu" className={styles.link}>
            Усе меню
            <IconChevronRight />
          </Link>
        </Reveal>
      </div>

      <div className={styles.grid}>
        {highlights.map((h, i) => (
          <Reveal key={h.title} delay={i * 0.07}>
            <div className={styles.card}>
              <div className={styles.cardGlow} aria-hidden="true" />
              <span className={styles.cardIcon}>
                <h.icon />
              </span>
              <h3 className={styles.cardTitle}>{h.title}</h3>
              <p className={styles.cardText}>{h.text}</p>
              <span className={styles.cardTag}>{h.tag}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);
