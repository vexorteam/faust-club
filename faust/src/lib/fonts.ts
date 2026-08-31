import localFont from "next/font/local"

export const unbounded = localFont({
  src: [
    { path: "../../public/fonts/unbounded/unbounded-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/unbounded/unbounded-cyrillic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/unbounded/unbounded-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/unbounded/unbounded-cyrillic-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/unbounded/unbounded-latin-800-normal.woff2", weight: "800", style: "normal" },
    { path: "../../public/fonts/unbounded/unbounded-cyrillic-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-unbounded",
  display: "swap",
  preload: true,
})

export const onest = localFont({
  src: [
    { path: "../../public/fonts/onest/onest-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/onest/onest-cyrillic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/onest/onest-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/onest/onest-cyrillic-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/onest/onest-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/onest/onest-cyrillic-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-onest",
  display: "swap",
  preload: true,
})

export const jetbrainsMono = localFont({
  src: [
    { path: "../../public/fonts/jetbrains-mono/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    {
      path: "../../public/fonts/jetbrains-mono/jetbrains-mono-cyrillic-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    { path: "../../public/fonts/jetbrains-mono/jetbrains-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    {
      path: "../../public/fonts/jetbrains-mono/jetbrains-mono-cyrillic-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
})

export const fontVariables = `${unbounded.variable} ${onest.variable} ${jetbrainsMono.variable}`
