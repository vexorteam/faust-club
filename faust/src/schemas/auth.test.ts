import { describe, expect, it } from "vitest"

import { loginResponseSchema, loginSchema, meResponseSchema } from "@/schemas/auth"

describe("loginSchema", () => {
  it("accepts a normal pair and normalises the address", () => {
    const parsed = loginSchema.safeParse({ email: "  Owner@Faust.BAR ", password: "nightshift" })

    expect(parsed.success && parsed.data.email).toBe("owner@faust.bar")
  })

  it("rejects a password shorter than eight characters", () => {
    const parsed = loginSchema.safeParse({ email: "owner@faust.bar", password: "1234567" })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.path[0]).toBe("password")
  })

  it("rejects something that is not an address", () => {
    const parsed = loginSchema.safeParse({ email: "owner", password: "nightshift" })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.path[0]).toBe("email")
  })

  it("does not invent a password out of a missing field", () => {
    expect(loginSchema.safeParse({ email: "owner@faust.bar" }).success).toBe(false)
  })
})

describe("loginResponseSchema", () => {
  const user = { id: "9f3a", name: "Власник", email: "owner@faust.bar" }

  it("renames the wire format into what the frontend speaks", () => {
    const parsed = loginResponseSchema.safeParse({ access_token: "jwt", expires_in: 604800, user })

    expect(parsed.success && parsed.data).toEqual({ token: "jwt", expiresIn: 604800, user })
  })

  it("refuses a response without a token", () => {
    expect(loginResponseSchema.safeParse({ expires_in: 604800, user }).success).toBe(false)
  })

  it("refuses a lifetime that is not a positive number of seconds", () => {
    expect(loginResponseSchema.safeParse({ access_token: "jwt", expires_in: 0, user }).success).toBe(false)
  })
})

describe("meResponseSchema", () => {
  it("requires a named user", () => {
    expect(meResponseSchema.safeParse({ user: { id: "9f3a", email: "owner@faust.bar" } }).success).toBe(false)
  })
})
