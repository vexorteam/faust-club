import Link from "next/link";
import styles from "./AdminPageHeader.module.css";

/**
 * Heading of an admin page: what this screen is, one line of why, and the one
 * action that belongs to it. Shared by every page so they cannot drift apart.
 *
 * The action is rendered here rather than passed in as markup, because the
 * public `ui/Button` cannot be reused: it scales on press and moves its arrow
 * on hover, and the admin area has no animation at all (§3.2).
 */

export type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
};

export const AdminPageHeader = ({ eyebrow, title, description, action }: AdminPageHeaderProps) => (
  <header className={styles.header}>
    <div className={styles.text}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
    </div>

    {action && (
      <Link href={action.href} className={styles.action}>
        {action.label}
      </Link>
    )}
  </header>
);
