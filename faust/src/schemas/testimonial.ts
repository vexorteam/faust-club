import { z } from "zod"

export const TESTIMONIAL_TEXT_MAX = 400
export const TESTIMONIAL_NAME_MAX = 60
export const TESTIMONIAL_META_MAX = 60

const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max, message)

export const testimonialFormSchema = z.object({
  text: requiredText(TESTIMONIAL_TEXT_MAX, `Текст відгуку — від 1 до ${TESTIMONIAL_TEXT_MAX} символів`),
  name: requiredText(TESTIMONIAL_NAME_MAX, `Ім'я — від 1 до ${TESTIMONIAL_NAME_MAX} символів`),
  meta: requiredText(TESTIMONIAL_META_MAX, `Підпис — від 1 до ${TESTIMONIAL_META_MAX} символів`),
  visible: z.boolean().default(true),
})

export const testimonialCreateSchema = testimonialFormSchema

export const testimonialPatchSchema = testimonialFormSchema
  .partial()
  .refine(patch => Object.keys(patch).length > 0, "Немає що змінювати")

export const adminTestimonialSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1).max(TESTIMONIAL_TEXT_MAX),
  name: z.string().trim().min(1).max(TESTIMONIAL_NAME_MAX),
  meta: z.string().trim().min(1).max(TESTIMONIAL_META_MAX),
  order: z.number().int(),
  visible: z.boolean(),
})

export const adminTestimonialsResponseSchema = z.object({ testimonials: z.array(adminTestimonialSchema) })
export const adminTestimonialResponseSchema = z.object({ testimonial: adminTestimonialSchema })

export const publicTestimonialSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1).max(TESTIMONIAL_TEXT_MAX),
  name: z.string().trim().min(1).max(TESTIMONIAL_NAME_MAX),
  meta: z.string().trim().min(1).max(TESTIMONIAL_META_MAX),
})

export const testimonialsResponseSchema = z.object({ testimonials: z.array(publicTestimonialSchema) })

export type TestimonialInput = z.output<typeof testimonialFormSchema>
export type TestimonialPatch = z.output<typeof testimonialPatchSchema>
export type AdminTestimonial = z.output<typeof adminTestimonialSchema>
export type PublicTestimonial = z.output<typeof publicTestimonialSchema>
