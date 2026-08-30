"use client";

import Image from "next/image";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Button } from "@/components/ui/Button";
import { site } from "@/data/site";
import { formatStatus, formatWeek, getOpenStatus, type OpenStatus } from "@/lib/hours";
import type { SiteSettingsView } from "@/types";
import styles from "./Hero.module.css";
import clubPhoto from "../../../public/img/back.jpg";

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

const MINUTE_MS = 60_000;

/** The wall clock is an external system: React reads it and never owns it. */
const subscribeToClock = (onChange: () => void): (() => void) => {
  const timer = window.setInterval(onChange, MINUTE_MS);

  return () => window.clearInterval(timer);
};

const noStatusYet = (): OpenStatus | null => null;

const useOpenStatus = (hours: SiteSettingsView["hours"]): OpenStatus | null => {
  const cache = useRef<{ minute: number; status: OpenStatus | null }>({ minute: -1, status: null });

  const read = useCallback((): OpenStatus | null => {
    const minute = Math.floor(Date.now() / MINUTE_MS);

    if (minute === cache.current.minute) return cache.current.status;

    let status: OpenStatus | null;

    try {
      status = getOpenStatus(new Date(), site.timeZone, hours);
    } catch (error) {
      console.error("[hero] не вдалося порахувати графік", error);
      status = null;
    }

    cache.current = { minute, status };

    return status;
  }, [hours]);

  return useSyncExternalStore(subscribeToClock, read, noStatusYet);
};

export const Hero = ({ settings }: { settings: SiteSettingsView }) => {
  const shouldReduceMotion = useReducedMotion();
  const status = useOpenStatus(settings.hours);

  const week = formatWeek(settings.hours);

  const metaLine = (
    <span className={styles.meta} aria-live="polite">
      <span>
        Вхід виключно {settings.ageRestriction} · {settings.contacts.addressShort}
      </span>

      {status && (
        <span>
          <span
            className={status.isOpen ? styles.statusDot : `${styles.statusDot} ${styles.statusDotClosed}`}
            aria-hidden="true"
          />
          {formatStatus(status)}
        </span>
      )}
    </span>
  );

  const heroBody = shouldReduceMotion ? (
    <div className={`container ${styles.content}`}>
      <span className="eyebrow">{week}</span>
      <h1 className={styles.lockupWrap} aria-label="Faust">
        <span className={styles.lockup}>
          <span className={styles.beamText}>FAUST</span>
        </span>
      </h1>
      <p className={styles.subtitle}>{settings.description}</p>
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
        {week}
      </motion.span>

      <motion.h1 variants={item} className={styles.lockupWrap} aria-label="Faust">
        <span className={styles.lockup}>
          <span className={styles.beamText}>FAUST</span>
        </span>
      </motion.h1>

      <motion.p variants={item} className={styles.subtitle}>
        {settings.description}
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
    <section className={styles.hero} aria-label="Faust — нічний клуб у Шепетівці">
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
