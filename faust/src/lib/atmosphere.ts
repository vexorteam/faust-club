import type { StaticImageData } from "next/image";
import danceImage from "../../public/img/sample/dance.jpeg";
import barImage from "../../public/img/sample/bar.jpg";
import vipImage from "../../public/img/sample/vip-zone.jpg";
import sceneImage from "../../public/img/sample/scene.jpeg";

export type AtmospherePhoto = {
  id: string;
  src: StaticImageData;
  alt: string;
  label: string;
};

const samplePhotos: AtmospherePhoto[] = [
  { id: "dance", src: danceImage, alt: "Танцпол Faust під час нічного сету", label: "Танцпол" },
  { id: "bar", src: barImage, alt: "Бар Faust", label: "Бар" },
  { id: "vip", src: vipImage, alt: "VIP-зона Faust", label: "VIP-зона" },
  { id: "scene", src: sceneImage, alt: "Сцена Faust", label: "Сцена" },
];

export const getAtmospherePhotos = async (): Promise<AtmospherePhoto[]> => samplePhotos;

/*
export type AtmosphereFeedPhoto = {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
};

type FeedResponse = { photos: unknown };

const MAX_PHOTOS = 12;
const REVALIDATE_SECONDS = 300;

const isValidFeedPhoto = (value: unknown): value is AtmosphereFeedPhoto => {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    p.id.length > 0 &&
    typeof p.url === "string" &&
    p.url.startsWith("https://") &&
    typeof p.alt === "string" &&
    p.alt.trim().length > 0 &&
    typeof p.width === "number" &&
    p.width > 0 &&
    typeof p.height === "number" &&
    p.height > 0
  );
};

export const getAtmospherePhotosFromBackend = async (): Promise<AtmosphereFeedPhoto[]> => {
  const endpoint = process.env.ATMOSPHERE_FEED_URL;
  if (!endpoint) return [];

  try {
    const res = await fetch(endpoint, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["atmosphere"] },
      headers: { accept: "application/json" },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as FeedResponse;
    if (!Array.isArray(data.photos)) return [];

    return data.photos.filter(isValidFeedPhoto).slice(0, MAX_PHOTOS);
  } catch {
    return [];
  }
};
*/
