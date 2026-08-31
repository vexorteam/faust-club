import type { AdminSocial } from "@/schemas/settings"

import { SocialCreateForm } from "./SocialCreateForm"
import styles from "./SocialList.module.css"
import { SocialRow } from "./SocialRow"

/**
 * Social profiles the footer links to, in the order it links to them.
 * Same hand-ordered list pattern as categories — see `CategoryList.tsx`.
 */

export type SocialListProps = { socials: readonly AdminSocial[] }

export const SocialList = ({ socials }: SocialListProps) => (
  <div className={styles.board}>
    <SocialCreateForm />

    {socials.length === 0 ? (
      <p className={styles.empty}>Соцмереж ще немає. Додайте першу — вона зʼявиться у футері сайту.</p>
    ) : (
      <ul className={styles.list}>
        {socials.map((social, index) => (
          <SocialRow
            key={social.id}
            social={social}
            isFirst={index === 0}
            isLast={index === socials.length - 1}
          />
        ))}
      </ul>
    )}
  </div>
)
