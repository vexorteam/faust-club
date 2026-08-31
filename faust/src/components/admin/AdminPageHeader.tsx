import Link from "next/link"

import styles from "./AdminPageHeader.module.css"

export type AdminPageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  action?: { href: string; label: string }
}

export const AdminPageHeader = ({ eyebrow, title, description, action }: AdminPageHeaderProps) => (
  <header className={styles.header}>
    <div className={styles.text}>
      {eyebrow && <span className='eyebrow'>{eyebrow}</span>}
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
    </div>

    {action && (
      <Link
        href={action.href}
        className={styles.action}
      >
        {action.label}
      </Link>
    )}
  </header>
)
