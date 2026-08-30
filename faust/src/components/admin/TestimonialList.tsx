import type { AdminTestimonial } from "@/schemas/testimonial";
import { TestimonialCreateForm } from "./TestimonialCreateForm";
import { TestimonialRow } from "./TestimonialRow";
import styles from "./TestimonialList.module.css";

/** Review cards of the home page grid, in the order they're shown. */

export type TestimonialListProps = { testimonials: readonly AdminTestimonial[] };

export const TestimonialList = ({ testimonials }: TestimonialListProps) => (
  <div className={styles.board}>
    <TestimonialCreateForm />

    {testimonials.length === 0 ? (
      <p className={styles.empty}>Відгуків ще немає. Додайте перший — і він зʼявиться на головній сторінці.</p>
    ) : (
      <ul className={styles.list}>
        {testimonials.map((testimonial, index) => (
          <TestimonialRow
            key={testimonial.id}
            testimonial={testimonial}
            isFirst={index === 0}
            isLast={index === testimonials.length - 1}
          />
        ))}
      </ul>
    )}
  </div>
);
