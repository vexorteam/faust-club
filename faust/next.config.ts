import type { NextConfig } from "next";

// Domain that serves backend-managed content: menu photos and the Atmosphere
// gallery. Next.js requires remote image domains to be allow-listed at build
// time for security, so this can't be resolved dynamically per-request.
const mediaHostname = process.env.MEDIA_HOSTNAME ?? "media.faust.bar";

const remotePatterns: NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> = [
  { protocol: "https", hostname: mediaHostname, pathname: "/**" },
];

// Locally the API serves photos over plain http from its own port, and the
// allow-list above only takes https (§13.4). Allow-listing the host is not
// enough on its own: Next also refuses to fetch an image from an address that
// resolves to a private IP, which is exactly what localhost is. Both are
// evaluated at build time, so a production build carries neither.
const isLocalDev = process.env.NODE_ENV === "development";

if (isLocalDev) {
  remotePatterns.push({ protocol: "http", hostname: "localhost", pathname: "/**" });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowLocalIP: isLocalDev,
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
    ];
  },
};

export default nextConfig;
