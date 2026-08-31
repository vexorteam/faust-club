import type { Metadata, Viewport } from "next"

import "modern-normalize/modern-normalize.css"

import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { SiteChrome } from "@/components/layout/SiteChrome"
import { SmoothScroll } from "@/components/layout/SmoothScroll"
import { site } from "@/data/site"
import { fontVariables } from "@/lib/fonts"
import { getSiteSettings } from "@/lib/settings"
import { siteUrl } from "@/lib/site-url"

import "./globals.css"

export const generateMetadata = async (): Promise<Metadata> => {
  const settings = await getSiteSettings()

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${settings.name} — ${settings.tagline}`,
      template: `%s · ${settings.name}`,
    },
    description: settings.description,
    keywords: [
      "нічний клуб",
      "Шепетівка",
      "коктейлі",
      "діджеї",
      "клуб",
      "бар",
      settings.name,
    ],
    authors: [{ name: settings.name }],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: site.locale,
      url: siteUrl,
      siteName: settings.name,
      title: `${settings.name} — ${settings.tagline}`,
      description: settings.description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${settings.name} — ${settings.tagline}`,
      description: settings.description,
    },
    robots: { index: true, follow: true },
  }
}

export const viewport: Viewport = {
  themeColor: site.themeColor,
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
}

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const settings = await getSiteSettings()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NightClub",
    name: settings.name,
    description: settings.description,
    url: siteUrl,
    telephone: settings.contacts.phone,
    email: settings.contacts.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.contacts.addressShort,
      addressLocality: "Шепетівка",
      addressCountry: "UA",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: settings.contacts.latitude,
      longitude: settings.contacts.longitude,
    },
    sameAs: settings.socials.map(s => s.href),
    openingHoursSpecification: settings.hours
      .filter(h => h.open && h.close)
      .map(h => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: h.label,
        opens: h.open,
        closes: h.close,
      })),
  }

  return (
    <html
      lang='uk'
      className={fontVariables}
    >
      <body>
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a
          href='#main'
          className='skip-link'
        >
          Перейти до контенту
        </a>
        <SmoothScroll>
          <SiteChrome
            header={<Header settings={settings} />}
            footer={<Footer settings={settings} />}
          >
            {children}
          </SiteChrome>
        </SmoothScroll>
      </body>
    </html>
  )
}

export default RootLayout
