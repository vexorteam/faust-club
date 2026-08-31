"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import styles from "./LogoutButton.module.css"

/**
 * The cookie is httpOnly, so signing out has to go through the server: the
 * route drops the cookie and tells the API to revoke the token.
 */
export const LogoutButton = () => {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const signOut = async () => {
    setPending(true)

    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("[auth] logout request failed", error)
    }

    router.replace("/admin/login")
    router.refresh()
  }

  return (
    <button
      type='button'
      className={styles.button}
      onClick={signOut}
      disabled={pending}
    >
      {pending ? "Виходимо…" : "Вийти"}
    </button>
  )
}
