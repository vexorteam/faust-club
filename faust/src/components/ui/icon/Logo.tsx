import type { IconProps } from "./types"

type LogoProps = IconProps & { title?: string }

export const Logo = ({ title = "Faust", ...props }: LogoProps) => (
  <svg
    viewBox='0 0 132 32'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    role='img'
    aria-label={title}
    {...props}
  >
    <defs>
      <linearGradient
        id='faust-glass'
        x1='4'
        y1='2'
        x2='22'
        y2='30'
        gradientUnits='userSpaceOnUse'
      >
        <stop
          offset='0'
          stopColor='#f0558b'
        />
        <stop
          offset='1'
          stopColor='#6d37a5'
        />
      </linearGradient>
    </defs>
    <path
      d='M4 4h20a1.6 1.6 0 0 1 1.24 2.6L15.4 17.2v7.3h5.1a1.5 1.5 0 0 1 0 3H7.5a1.5 1.5 0 0 1 0-3h5.1v-7.3L2.76 6.6A1.6 1.6 0 0 1 4 4Z'
      fill='url(#faust-glass)'
    />
    <path
      d='M7 7h18'
      stroke='#0d0713'
      strokeWidth='1.4'
      strokeLinecap='round'
      opacity='0.35'
    />
    <text
      x='34'
      y='24'
      fill='currentColor'
      fontFamily='var(--font-display, sans-serif)'
      fontWeight='700'
      fontSize='21'
      letterSpacing='0.5'
    >
      FAUST
    </text>
  </svg>
)
