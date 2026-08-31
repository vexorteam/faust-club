import type { IconProps } from "./types"

export const IconMail = (props: IconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    aria-hidden='true'
    {...props}
  >
    <rect
      x='3.5'
      y='5.5'
      width='17'
      height='13'
      rx='2'
      stroke='currentColor'
      strokeWidth='1.5'
    />
    <path
      d='m4.5 7 7.5 6 7.5-6'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    />
  </svg>
)
