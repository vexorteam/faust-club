import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

const Icon = () =>
  new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#070707",
        borderRadius: 7,
      }}
    >
      <svg
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
      >
        <defs>
          <linearGradient
            id='g'
            x1='4'
            y1='2'
            x2='20'
            y2='22'
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
          d='M4 4h16l-6.5 8v6.5h3.5v1.5H7v-1.5h3.5V12L4 4Z'
          fill='url(#g)'
        />
      </svg>
    </div>,
    { ...size }
  )

export default Icon
