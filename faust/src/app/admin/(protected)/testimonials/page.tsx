import type { Metadata } from "next"

import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { TestimonialList } from "@/components/admin/TestimonialList"
import { listTestimonials } from "@/lib/admin"
import { requireAdminOrRedirect } from "@/lib/session"

/** Review cards of the home page's "Відгуки" grid. */

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Відгуки",
  robots: { index: false, follow: false, nocache: true },
}

const TestimonialsPage = async () => {
  await requireAdminOrRedirect()

  const testimonials = await listTestimonials()

  return (
    <section>
      <AdminPageHeader
        eyebrow='сайт'
        title='Відгуки'
        description='Картки відгуків на головній сторінці. Прихований відгук лишається тут, але зникає з сайту.'
      />

      <TestimonialList testimonials={testimonials} />
    </section>
  )
}

export default TestimonialsPage
