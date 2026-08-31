import Link from "next/link"
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react"

import styles from "./Button.module.css"
import { IconArrowUpRight } from "./icon"

type Variant = "primary" | "ghost"

type BaseProps = {
  variant?: Variant
  full?: boolean
  showArrow?: boolean
  children: ReactNode
  className?: string
}

type LinkProps = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string
    external?: boolean
  }

type NativeButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>

export type ButtonProps = LinkProps | NativeButtonProps

const OWN_KEYS = [
  "variant",
  "full",
  "showArrow",
  "children",
  "className",
] as const

const isLinkProps = (props: ButtonProps): props is LinkProps => typeof (props as LinkProps).href === "string"

const classNames = (variant: Variant, full: boolean | undefined, className: string | undefined) =>
  [
    styles.button,
    variant === "primary" ? styles.primary : styles.ghost,
    full && styles.full,
    className,
  ]
    .filter(Boolean)
    .join(" ")

const omitOwnProps = <T extends object>(props: T): Omit<T, (typeof OWN_KEYS)[number]> => {
  const rest = { ...props } as Record<string, unknown>
  for (const key of OWN_KEYS) delete rest[key]
  return rest as Omit<T, (typeof OWN_KEYS)[number]>
}

export const Button = (props: ButtonProps) => {
  const { variant = "primary", full, showArrow, children, className } = props
  const cls = classNames(variant, full, className)

  if (isLinkProps(props)) {
    const { href, external, ...linkOwned } = omitOwnProps(props)
    const externalProps = external ? { target: "_blank", rel: "noreferrer noopener" } : {}
    return (
      <Link
        href={href}
        className={cls}
        {...externalProps}
        {...linkOwned}
      >
        {children}
        {showArrow && <IconArrowUpRight className={styles.icon} />}
      </Link>
    )
  }

  const buttonOwned = omitOwnProps(props)
  return (
    <button
      className={cls}
      {...buttonOwned}
    >
      {children}
      {showArrow && <IconArrowUpRight className={styles.icon} />}
    </button>
  )
}
