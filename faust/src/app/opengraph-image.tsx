import { ImageResponse } from "next/og";
import { site } from "@/data/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const OpengraphImage = () =>
  new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 80,
          background:
            "radial-gradient(120% 90% at 50% 0%, #1c1030 0%, #070707 55%), linear-gradient(180deg, transparent 0%, #0d0713 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="g" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#f0558b" />
                <stop offset="1" stopColor="#6d37a5" />
              </linearGradient>
            </defs>
            <path d="M4 4h16l-6.5 8v6.5h3.5v1.5H7v-1.5h3.5V12L4 4Z" fill="url(#g)" />
          </svg>
          <span style={{ color: "#a7aebe", fontSize: 24, letterSpacing: 4 }}>NIGHT CLUB</span>
        </div>
        <div style={{ display: "flex", color: "#ffffff", fontSize: 130, fontWeight: 800, letterSpacing: -2 }}>
          FAUST
        </div>
        <div style={{ display: "flex", color: "#a7aebe", fontSize: 28, marginTop: 12 }}>{site.tagline}</div>
      </div>
    ),
    { ...size },
  );

export default OpengraphImage;
