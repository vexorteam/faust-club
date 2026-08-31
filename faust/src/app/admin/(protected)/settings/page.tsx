import type { Metadata } from "next"

import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { HoursList } from "@/components/admin/HoursList"
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm"
import { SocialList } from "@/components/admin/SocialList"
import { getSiteSettingsAdmin, listHours, listSocials } from "@/lib/admin"
import { requireAdminOrRedirect } from "@/lib/session"
import styles from "./page.module.css"

/** The club's own facts: name, contacts, weekly hours, social links. */

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Налаштування",
  robots: { index: false, follow: false, nocache: true },
}

const SettingsPage = async () => {
  await requireAdminOrRedirect()

  const [
    settings,
    hours,
    socials,
  ] = await Promise.all([
    getSiteSettingsAdmin(),
    listHours(),
    listSocials(),
  ])

  return (
    <section>
      <AdminPageHeader
        eyebrow='сайт'
        title='Налаштування'
        description='Назва, контакти, години роботи й соцмережі клубу — те, що бачать усі відвідувачі сайту.'
      />

      <SiteSettingsForm settings={settings} />

      <div className={styles.block}>
        <h2 className={styles.blockTitle}>Години роботи</h2>
        <HoursList hours={hours} />
      </div>

      <div className={styles.block}>
        <h2 className={styles.blockTitle}>Соцмережі</h2>
        <SocialList socials={socials} />
      </div>
    </section>
  )
}

export default SettingsPage
