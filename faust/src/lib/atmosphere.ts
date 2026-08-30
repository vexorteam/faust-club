import { apiRequest } from "@/lib/api";
import { atmosphereResponseSchema } from "@/schemas/atmosphere";
import type { AtmospherePhotoView } from "@/types";

const REVALIDATE_SECONDS = 3600;

export const getAtmospherePhotos = async (): Promise<AtmospherePhotoView[]> => {
  try {
    return await apiRequest("/api/v1/atmosphere", atmosphereResponseSchema, {
      next: { tags: ["atmosphere"], revalidate: REVALIDATE_SECONDS },
    });
  } catch (error) {
    console.error("[atmosphere] the API did not deliver the photos", error);

    /** No photos means no section — better an absent block than an empty grid. */
    return [];
  }
};
