"use client";

import { useEffect, useState } from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Reveal } from "@/components/layout/Reveal";
import { Button } from "@/components/ui/Button";
import { IconPin, IconPhone, IconMail, IconClock, IconArrowUpRight } from "@/components/ui/icon";
import { site } from "@/data/site";
import styles from "./FindUs.module.css";

const getTodayWeekday = (timeZone: string): number => {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" });
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[formatter.format(new Date())] ?? 0;
};

export const FindUs = () => {
  const [today, setToday] = useState<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setToday(getTodayWeekday(site.timeZone)), 0);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <section id="contacts" className={styles.section} aria-labelledby="findus-heading">
      <div className="container">
        <Reveal>
          <SectionTitle id="findus-heading" eyebrow="Візит" title="Знайти" accent="Faust" />
        </Reveal>

        <div className={styles.grid}>
          <Reveal delay={0.05} className={styles.mapCard}>
            <div className={styles.mapGrid} aria-hidden="true" />
            <div className={styles.pin} aria-hidden="true">
              <IconPin />
            </div>
            <a href={site.contacts.mapsUrl} target="_blank" rel="noreferrer noopener" className={styles.mapLink}>
              Відкрити в Google Maps
              <IconArrowUpRight />
            </a>
          </Reveal>

          <Reveal delay={0.1} className={styles.infoCard}>
            <div className={styles.row}>
              <IconPin className={styles.rowIcon} />
              <div>
                <div className={styles.rowLabel}>Адреса</div>
                <div className={styles.rowValue}>{site.contacts.address}</div>
              </div>
            </div>

            <div className={styles.row}>
              <IconPhone className={styles.rowIcon} />
              <div>
                <div className={styles.rowLabel}>Телефон</div>
                <div className={styles.rowValue}>
                  <a href={site.contacts.phoneHref}>{site.contacts.phone}</a>
                </div>
              </div>
            </div>

            <div className={styles.row}>
              <IconMail className={styles.rowIcon} />
              <div>
                <div className={styles.rowLabel}>Пошта</div>
                <div className={styles.rowValue}>
                  <a href={site.contacts.emailHref}>{site.contacts.email}</a>
                </div>
              </div>
            </div>

            <div className={styles.row}>
              <IconClock className={styles.rowIcon} />
              <div style={{ width: "100%" }}>
                <div className={styles.rowLabel}>Години роботи</div>
                <div className={styles.hoursTable}>
                  {site.hours.map((h) => (
                    <div key={h.day} className={`${styles.hoursRow} ${today === h.day ? styles.hoursToday : ""}`}>
                      <span>{h.label}</span>
                      <span>{h.open ? `${h.open}–${h.close}` : "вихідний"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button href={site.contacts.phoneHref} variant="primary" full>
              Зв’язатися з нами
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
