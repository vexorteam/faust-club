import type { IconProps } from "./types"

export const IconPin = (props: IconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    aria-hidden='true'
    {...props}
  >
    <path
      d='M12 22s7-6.2 7-12.3A7 7 0 0 0 5 9.7C5 15.8 12 22 12 22Z'
      stroke='currentColor'
      strokeWidth='1.5'
    />
    <circle
      cx='12'
      cy='9.5'
      r='2.5'
      stroke='currentColor'
      strokeWidth='1.5'
    />
  </svg>
)
