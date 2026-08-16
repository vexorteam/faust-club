"use client";

import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Button } from "@/components/ui/Button";
import styles from "./Hero.module.css";
import clubPhoto from "../../../public/img/back.jpg";
import { site } from "@/data/site";

const container: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

export const Hero = () => {
  const shouldReduceMotion = useReducedMotion();

  const metaLine = (
    <span className={styles.meta} aria-live="polite">
      <span>Вхід виключно {site.ageRestriction} · вул. Хрещатик, 22</span>
    </span>
  );

  const heroBody = shouldReduceMotion ? (
    <div className={`container ${styles.content}`}>
      <span className="eyebrow">П&rsquo;ятниця · Субота · 22:00</span>
      <h1 className={styles.lockupWrap} aria-label="Faust">
        <span className={styles.lockup}>
          <span className={styles.beamText}>FAUST</span>
        </span>
      </h1>
      <p className={styles.subtitle}>
        Авторські коктейлі, особлива атмосфера та ритм, який задає настрій усьому вечору. Завітайте — і ви зрозумієте,
        чому про нас говорить усе місто.
      </p>
      {metaLine}
      <div className={styles.actions}>
        <Button href="/menu" variant="primary" showArrow>
          Відкрити меню
        </Button>
        <Button href="#club" variant="ghost">
          Про клуб
        </Button>
      </div>
    </div>
  ) : (
    <motion.div className={`container ${styles.content}`} variants={container} initial="hidden" animate="visible">
      <motion.span variants={item} className="eyebrow">
        П&rsquo;ятниця · Субота · 22:00
      </motion.span>

      <motion.h1 variants={item} className={styles.lockupWrap} aria-label="Faust">
        <span className={styles.lockup}>
          <span className={styles.beamText}>FAUST</span>
        </span>
      </motion.h1>

      <motion.p variants={item} className={styles.subtitle}>
        Авторські коктейлі, особлива атмосфера та ритм, який задає настрій усьому вечору. Завітайте — і ви зрозумієте,
        чому про нас говорить усе місто.
      </motion.p>
      <motion.div variants={item}>{metaLine}</motion.div>

      <motion.div variants={item} className={styles.actions}>
        <Button href="/menu" variant="primary" showArrow>
          Відкрити меню
        </Button>
        <Button href="#club" variant="ghost">
          Про клуб
        </Button>
      </motion.div>
    </motion.div>
  );

  return (
    <section className={styles.hero} aria-label="Faust — нічний клуб у Києві">
      <div className={styles.backdrop} aria-hidden="true" />

      <div className={styles.photo} aria-hidden="true">
        <Image src={clubPhoto} alt="" fill sizes="(max-width: 767px) 100vw, 65vw" priority placeholder="blur" />
      </div>

      <div className={styles.glow} aria-hidden="true" />
      <svg className={styles.grain} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <filter id="hero-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-noise)" opacity="0.5" />
      </svg>

      {heroBody}

      <div className={styles.scrollHint} aria-hidden="true">
        <span className={styles.scrollLine} />
        Гортайте
      </div>
    </section>
  );
};
