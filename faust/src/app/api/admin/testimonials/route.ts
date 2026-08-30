import { adminRoute, parseBody, readJsonBody } from "@/lib/admin-route";
import { createTestimonial } from "@/lib/admin";
import { testimonialCreateSchema } from "@/schemas/testimonial";

/** `POST /api/admin/testimonials` — a new review card for the home page grid. */

export const dynamic = "force-dynamic";

export const POST = async (request: Request) =>
  adminRoute(async () => {
    const input = parseBody(testimonialCreateSchema, await readJsonBody(request));

    return createTestimonial(input);
  });
