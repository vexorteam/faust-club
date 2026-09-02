import type { NextConfig } from "next"

const mediaHostname = process.env.MEDIA_HOSTNAME ?? "media.faust.bar"

const remotePatterns: NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> = [
  { protocol: "https", hostname: mediaHostname, pathname: "/**" },
]

const isLocalMedia = process.env.NODE_ENV === "development" || process.env.LOCAL_MEDIA === "1"

if (isLocalMedia) {
  remotePatterns.push(
    { protocol: "http", hostname: "localhost", pathname: "/**" },
    { protocol: "http", hostname: mediaHostname, pathname: "/**" }
  )
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: process.env.VERCEL ? undefined : "standalone",
  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowLocalIP: isLocalMedia,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ]
  },
}

export default nextConfig
