import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/**
 * Faust wordmark: "F" set in Unbounded, preceded by the martini-glass glyph
 * traced from the reference club mockup (bowl + stem + base), recolored to
 * the site's magenta→violet accent. `title` is required for a11y since the
 * mark also functions as the home link.
 */
export function Logo({ title = "Faust", ...props }: IconProps & { title?: string }) {
  return (
    <svg
      viewBox="0 0 132 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      {...props}
    >
      <defs>
        <linearGradient id="faust-glass" x1="4" y1="2" x2="22" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f0558b" />
          <stop offset="1" stopColor="#6d37a5" />
        </linearGradient>
      </defs>
      {/* Martini glass mark */}
      <path
        d="M4 4h20a1.6 1.6 0 0 1 1.24 2.6L15.4 17.2v7.3h5.1a1.5 1.5 0 0 1 0 3H7.5a1.5 1.5 0 0 1 0-3h5.1v-7.3L2.76 6.6A1.6 1.6 0 0 1 4 4Z"
        fill="url(#faust-glass)"
      />
      <path d="M7 7h18" stroke="#0d0713" strokeWidth="1.4" strokeLinecap="round" opacity="0.35" />
      {/* Wordmark */}
      <text
        x="34"
        y="24"
        fill="currentColor"
        fontFamily="var(--font-display, sans-serif)"
        fontWeight="700"
        fontSize="21"
        letterSpacing="0.5"
      >
        FAUST
      </text>
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconPin(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="M12 22s7-6.2 7-12.3A7 7 0 0 0 5 9.7C5 15.8 12 22 12 22Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="M5.5 4h3l1.5 4.5-2.2 1.6a12 12 0 0 0 6.1 6.1l1.6-2.2 4.5 1.5v3a1.5 1.5 0 0 1-1.6 1.5C10.6 19.4 4.6 13.4 4 5.6A1.5 1.5 0 0 1 5.5 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconInstagram(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.1" cy="6.9" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function IconTelegram(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="m4 11.5 16-6.7-2.8 15-5-3.6-2.6 2.5-.4-4 8-7.4-9.6 6.4L4 11.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconTiktok(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="M14 3.5c.5 2 2 3.4 4 3.7v2.7a7 7 0 0 1-4-1.3v6.1a5 5 0 1 1-4-4.9v2.8a2.3 2.3 0 1 0 1.6 2.2V3.5H14Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconArrowUpRight(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconQuote(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="M9.5 6.5C6.5 8 5 10.3 5 13c0 2 1.3 3.4 3 3.4 1.6 0 2.8-1.2 2.8-2.8 0-1.5-1-2.6-2.4-2.7.4-1.3 1.5-2.5 3-3.3L9.5 6.5Zm8 0C14.5 8 13 10.3 13 13c0 2 1.3 3.4 3 3.4 1.6 0 2.8-1.2 2.8-2.8 0-1.5-1-2.6-2.4-2.7.4-1.3 1.5-2.5 3-3.3l-1.9-1.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
    </svg>
  );
}

export function IconGlassCocktail(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="M4 4h16l-6.5 8v6.5h3.5v1.5H7v-1.5h3.5V12L4 4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6.2 6.5h11.6" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
    </svg>
  );
}

export function IconMusic(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="M9.5 17.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Zm0 0V6.3L18 4.5v9.2m-8.5-6L18 5.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 13.7a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function IconSpark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="M12 3c.6 3.4 2.6 5.4 6 6-3.4.6-5.4 2.6-6 6-.6-3.4-2.6-5.4-6-6 3.4-.6 5.4-2.6 6-6Z"
        fill="currentColor"
      />
    </svg>
  );
}
