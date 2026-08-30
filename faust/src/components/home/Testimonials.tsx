"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Reveal } from "@/components/layout/Reveal";
import { IconQuote } from "@/components/ui/icon";
import type { TestimonialView } from "@/types";
import styles from "./Testimonials.module.css";

/** Cards per page — matches the 3-column grid at desktop width. */
const PAGE_SIZE = 3;
const ROTATE_MS = 5000;

const chunk = <T,>(items: T[], size: number): T[][] => {
  const pages: T[][] = [];

  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));

  return pages;
};

const Card = ({ testimonial }: { testimonial: TestimonialView }) => (
  <figure className={styles.card}>
    <div className={styles.cardGlow} />
    <IconQuote className={styles.quoteIcon} />
    <blockquote className={styles.text}>{testimonial.text}</blockquote>
    <figcaption className={styles.author}>
      <span className={styles.avatar} aria-hidden="true">
        {testimonial.name.charAt(0)}
      </span>
      <span>
        <div className={styles.authorName}>{testimonial.name}</div>
        <div className={styles.authorMeta}>{testimonial.meta}</div>
      </span>
    </figcaption>
  </figure>
);

export const Testimonials = ({ testimonials }: { testimonials: TestimonialView[] }) => {
  const shouldReduceMotion = useReducedMotion();
  const pages = useMemo(() => chunk(testimonials, PAGE_SIZE), [testimonials]);
  const [rawPage, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const pageCount = pages.length;
  const page = pageCount === 0 ? 0 : rawPage % pageCount;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pageCount <= 1 || paused || shouldReduceMotion) return;

    timerRef.current = setInterval(() => {
      setPage((current) => current + 1);
    }, ROTATE_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pageCount, paused, shouldReduceMotion]);

  if (testimonials.length === 0) return null;

  const current = pages[page] ?? [];

  return (
    <section id="reviews" className={styles.section} aria-labelledby="testimonials-heading">
      <div className="container">
        <Reveal>
          <SectionTitle id="testimonials-heading" eyebrow="Відгуки" title="Не вірте нам" accent="повірте гостям" />
        </Reveal>

        <div
          className={styles.carousel}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {shouldReduceMotion ? (
            <div className={styles.grid}>
              {current.map((t) => (
                <Card key={t.id} testimonial={t} />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={page}
                className={styles.grid}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                {current.map((t) => (
                  <Card key={t.id} testimonial={t} />
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          {pageCount > 1 && (
            <div className={styles.dots} role="tablist" aria-label="Сторінки відгуків">
              {pages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  role="tab"
                  aria-selected={index === page}
                  aria-label={`Показати відгуки ${index + 1} з ${pageCount}`}
                  className={index === page ? `${styles.dot} ${styles.dotActive}` : styles.dot}
                  onClick={() => setPage(index)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
