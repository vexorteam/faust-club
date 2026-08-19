import Image from "next/image";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Reveal } from "@/components/layout/Reveal";
import { formatWorkingDays } from "@/lib/hours";
import styles from "./About.module.css";
import aboutPhoto from "../../../public/img/disco.jpg";

const facts = [
  /* Read out of `site.hours`, not typed out: the fact used to say "7/7 днів на
     тиждень" while the footer, the hero and the JSON-LD all said Чт–Сб. */
  { value: formatWorkingDays(), label: "ночі щотижня" },
  { value: "180+", label: "коктейлів" },
  { value: "1000+", label: "вдячних гостей" },
];

export const About = () => (
  <section id="club" className={styles.section} aria-labelledby="about-heading">
    <div className={`container ${styles.grid}`}>
      <div className={styles.text}>
        <Reveal>
          <SectionTitle id="about-heading" eyebrow="Хто ми" title="Клуб, який" accent="задає ритм міста" />
        </Reveal>

        <Reveal delay={0.05}>
          <p className={styles.paragraph}>
            Faust народився з ідеї, що ніч у клубі — це не просто музика, а повноцінна режисура: світло, звук, смак і
            люди складаються в одну історію. Ми наповнюємо кожен вечір особливою енергією, унікальними міксами від бару
            та атмосферою.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className={styles.facts}>
            {facts.map((fact) => (
              <div key={fact.label} className={styles.fact}>
                <div className={styles.factValue}>{fact.value}</div>
                <div className={styles.factLabel}>{fact.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.1} className={styles.visual}>
        <Image
          src={aboutPhoto}
          alt="Атмосфера всередині клубу Faust"
          fill
          className={styles.visualImage}
          sizes="(min-width: 900px) 45vw, 100vw"
          placeholder="blur"
        />
        <span className={styles.visualMark} aria-hidden="true">
          FAUST
        </span>
      </Reveal>
    </div>
  </section>
);
