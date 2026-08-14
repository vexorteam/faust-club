"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { MenuCategory } from "@/data/menu";
import { Reveal } from "@/components/layout/Reveal";
import styles from "./MenuSections.module.css";

export const MenuSections = ({ categories }: { categories: MenuCategory[] }) => {
  const [active, setActive] = useState(categories[0]?.slug ?? "");
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-160px 0px -70% 0px", threshold: 0 },
    );

    for (const el of sectionRefs.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [categories]);

  return (
    <>
      <div className={styles.tabsWrap}>
        <nav className={`container ${styles.tabs}`} aria-label="Категорії меню">
          {categories.map((category) => (
            <a
              key={category.slug}
              href={`#${category.slug}`}
              className={`${styles.tab} ${active === category.slug ? styles.tabActive : ""}`}
              aria-current={active === category.slug ? "true" : undefined}
            >
              {category.label}
            </a>
          ))}
        </nav>
      </div>

      {categories.map((category) => (
        <section
          key={category.slug}
          id={category.slug}
          ref={(el) => {
            if (el) sectionRefs.current.set(category.slug, el);
            else sectionRefs.current.delete(category.slug);
          }}
          className={styles.category}
          aria-labelledby={`${category.slug}-title`}
        >
          <div className="container">
            <Reveal>
              <h2 id={`${category.slug}-title`} className={styles.categoryTitle}>
                {category.label}
              </h2>
            </Reveal>

            <div className={styles.grid}>
              {category.items.map((item, i) => (
                <Reveal key={item.id} delay={Math.min(i * 0.04, 0.2)}>
                  <div className={styles.item}>
                    {item.image && (
                      <div className={styles.itemImageWrap}>
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 720px) 50vw, 100vw"
                          className={styles.itemImage}
                        />
                      </div>
                    )}

                    <div className={styles.itemContent}>
                      <div className={styles.itemMain}>
                        <span className={styles.itemName}>{item.name}</span>
                        <span className={styles.itemDesc}>{item.description}</span>
                      </div>

                      <div className={styles.itemFooter}>
                        <span className={styles.itemPrice}>{item.price} ₴</span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ))}
    </>
  );
};
