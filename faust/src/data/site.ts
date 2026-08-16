export const site = {
  name: "Faust",
  tagline: "Нічний клуб у серці Києва",
  description: "Faust — авторські коктейлі, особлива атмосфера та ритм, який задає настрій усьому вечору.",
  url: "https://faust.bar",
  locale: "uk_UA",
  themeColor: "#070707",

  contacts: {
    phone: "+380 44 123 45 67",
    phoneHref: "tel:+380441234567",
    email: "info@faust.club",
    emailHref: "mailto:info@faust.club",
    address: "вул. Хрещатик, 22, Київ, 01001",
    addressShort: "Хрещатик, 22",
    mapsUrl: "https://maps.google.com/?q=50.4501,30.5234",
    mapsEmbedQuery: "Хрещатик 22, Київ",
    coordinates: { lat: 50.4501, lng: 30.5234 },
  },

  socials: [
    { name: "Instagram", href: "https://instagram.com/faust.club", handle: "@faust.club" },
    { name: "Telegram", href: "https://t.me/faustclub", handle: "@faustclub" },
    { name: "TikTok", href: "https://tiktok.com/@faust.club", handle: "@faust.club" },
  ],

  hours: [
    { day: 1, label: "Понеділок", open: null, close: null },
    { day: 2, label: "Вівторок", open: null, close: null },
    { day: 3, label: "Середа", open: null, close: null },
    { day: 4, label: "Четвер", open: "22:00", close: "03:00", closesNextDay: true },
    { day: 5, label: "П'ятниця", open: "22:00", close: "04:00", closesNextDay: true },
    { day: 6, label: "Субота", open: "22:00", close: "04:00", closesNextDay: true },
    { day: 7, label: "Неділя", open: null, close: null },
  ] as const,

  ageRestriction: "18+",
  timeZone: "Europe/Kyiv",

  nav: [
    { label: "Клуб", href: "/#club" },
    { label: "Меню", href: "/menu" },
    { label: "Відгуки", href: "/#reviews" },
    { label: "Контакти", href: "/#contacts" },
  ],
} as const;

export type SiteConfig = typeof site;
