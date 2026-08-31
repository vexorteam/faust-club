import type { IconProps } from "./types"

export const IconMenu = (props: IconProps) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    aria-hidden='true'
    {...props}
  >
    <path
      d='M4 7h16M4 12h16M4 17h16'
      stroke='currentColor'
      strokeWidth='1.6'
      strokeLinecap='round'
    />
  </svg>
)
