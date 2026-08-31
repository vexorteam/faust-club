import type { IconProps } from "@/components/ui/icon"
import type { ComponentType } from "react"

import { IconGlobe, IconInstagram, IconTelegram, IconTiktok } from "@/components/ui/icon"

const KNOWN_SOCIAL_ICONS: Record<string, ComponentType<IconProps>> = {
  instagram: IconInstagram,
  telegram: IconTelegram,
  tiktok: IconTiktok,
}

export const resolveSocialIcon = (name: string): ComponentType<IconProps> =>
  KNOWN_SOCIAL_ICONS[name.trim().toLowerCase()] ?? IconGlobe
