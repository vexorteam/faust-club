import type { ElementType, ReactNode } from "react";
import styles from "./SectionTitle.module.css";

type SectionTitleProps = {
  eyebrow?: string;
  title: ReactNode;
  accent?: string;
  description?: ReactNode;
  align?: "left" | "center";
  as?: ElementType;
  id?: string;
};

export const SectionTitle = ({
  eyebrow,
  title,
  accent,
  description,
  align = "left",
  as: Heading = "h2",
  id,
}: SectionTitleProps) => (
  <div className={`${styles.wrap} ${align === "center" ? styles.center : ""}`}>
    {eyebrow && <span className="eyebrow">{eyebrow}</span>}
    <Heading id={id} className={styles.heading}>
      {title} {accent && <span className={styles.accent}>{accent}</span>}
    </Heading>
    {description && <p className={styles.description}>{description}</p>}
  </div>
);
