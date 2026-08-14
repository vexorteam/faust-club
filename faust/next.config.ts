import type { NextConfig } from "next";

// Domain that serves backend-managed content (currently: Atmosphere gallery
// photos). Set this to your actual CDN/storage hostname before deploying —
// e.g. Cloudinary, S3, Bunny, or your own media host. Next.js requires
// remote image domains to be allow-listed at build time for security, so
// this can't be resolved dynamically per-request.
const mediaHostname = process.env.MEDIA_HOSTNAME ?? "images.faust.club";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: mediaHostname, pathname: "/**" }],
    formats: ["image/avif", "image/webp"],
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
