export const site = {
  name: "Faust",
  tagline: "Нічний клуб у серці Шепетівки",
  description: "Faust — авторські коктейлі, особлива атмосфера та ритм, який задає настрій усьому вечору",
  url: "https://faust.bar",
  locale: "uk_UA",
  themeColor: "#070707",

  contacts: {
    phone: "+380 66 727 9143",
    phoneHref: "tel:+380667279143",
    email: "hello@faust.bar",
    emailHref: "mailto:hello@faust.bar",
    address: "вул. Соборності, 6а, Шепетівка, 30405",
    addressShort: "Соборності, 6а",
    mapsUrl: "https://maps.google.com/?q=50.1814,27.0637",
    mapsEmbedQuery: "Соборності 6а, Шепетівка",
    coordinates: { lat: 50.1814, lng: 27.0637 },
  },

  socials: [
    { name: "Instagram", href: "https://www.instagram.com/faust.club", handle: "@faust.club" },
    { name: "TikTok", href: "https://www.tiktok.com/@faustrahsb4", handle: "@faustrahsb4" },
  ],

  hours: [
    { day: 1, label: "Понеділок", open: "18:00", close: "23:30", closesNextDay: false },
    { day: 2, label: "Вівторок", open: "18:00", close: "23:30", closesNextDay: false },
    { day: 3, label: "Середа", open: "18:00", close: "23:30", closesNextDay: false },
    { day: 4, label: "Четвер", open: "18:00", close: "23:30", closesNextDay: false },
    { day: 5, label: "П'ятниця", open: "18:00", close: "23:30", closesNextDay: false },
    { day: 6, label: "Субота", open: "18:00", close: "23:30", closesNextDay: false },
    { day: 7, label: "Неділя", open: null, close: null, closesNextDay: false },
  ] as const,

  ageRestriction: "16+",
  timeZone: "Europe/Kyiv",

  nav: [
    { label: "Клуб", href: "/#club" },
    { label: "Меню", href: "/menu" },
    { label: "Відгуки", href: "/#reviews" },
    { label: "Контакти", href: "/#contacts" },
  ],
} as const

export type SiteConfig = typeof site
