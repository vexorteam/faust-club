import { apiRequest } from "@/lib/api";
import { testimonialsResponseSchema } from "@/schemas/testimonial";
import type { TestimonialView } from "@/types";

const REVALIDATE_SECONDS = 3600;

export const getTestimonials = async (): Promise<TestimonialView[]> => {
  try {
    const { testimonials } = await apiRequest("/api/v1/testimonials", testimonialsResponseSchema, {
      next: { tags: ["testimonials"], revalidate: REVALIDATE_SECONDS },
    });

    return testimonials;
  } catch (error) {
    console.error("[testimonials] the API did not deliver the reviews", error);

    /** No reviews means no section — better an absent block than an empty grid. */
    return [];
  }
};
