import { apiRequest } from "@/lib/api";
import { atmosphereResponseSchema } from "@/schemas/atmosphere";
import type { AtmospherePhotoView } from "@/types";

/**
 * Photos of the "Атмосфера" section, now owned by the owner rather than by the
 * repository: they are uploaded in the admin area and served by the API.
 *
 * The cache tag is its own — editing a photo must not invalidate the menu, and
 * the other way round (§5.3).
 */

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
