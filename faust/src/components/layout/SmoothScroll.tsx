"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export const SmoothScroll = ({ children }: { children: ReactNode }) => {
  const shouldReduceMotion = useReducedMotion();
  const pathname = usePathname();

  // The admin area has no animations at all — smooth scrolling included.
  if (shouldReduceMotion || pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.12,
        duration: 1.1,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.2,
        anchors: true,
      }}
    >
      {children}
    </ReactLenis>
  );
};
