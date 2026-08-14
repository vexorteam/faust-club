import type { Metadata, Viewport } from "next";
import "modern-normalize/modern-normalize.css";
import { fontVariables } from "@/lib/fonts";
import { site } from "@/data/site";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  keywords: ["нічний клуб", "Київ", "коктейлі", "діджеї", "клуб", "бар", site.name],
  authors: [{ name: site.name }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: site.themeColor,
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "NightClub",
  name: site.name,
  description: site.description,
  url: site.url,
  telephone: site.contacts.phone,
  email: site.contacts.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: site.contacts.addressShort,
    addressLocality: "Київ",
    addressCountry: "UA",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: site.contacts.coordinates.lat,
    longitude: site.contacts.coordinates.lng,
  },
  sameAs: site.socials.map((s) => s.href),
  openingHoursSpecification: site.hours
    .filter((h) => h.open && h.close)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.label,
      opens: h.open,
      closes: h.close,
    })),
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="uk" className={fontVariables}>
    <body>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <a href="#main" className="skip-link">
        Перейти до контенту
      </a>
      <SmoothScroll>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </SmoothScroll>
    </body>
  </html>
);

export default RootLayout;
