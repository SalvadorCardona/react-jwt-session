import { beforeEach, describe, expect, it } from "vitest"
import { decodeJwt } from "@/decodeJwt"
import { getUserToken, setUserToken } from "@/UserToken"
import { getTokenDecrypted } from "@/getTokenDecrypted"
import { isLogged } from "@/isLogged"
import { hasRole } from "@/hasRole"
import { logout } from "@/logout"
import { getUserInLocalStorage, setUserInLocalStorage } from "@/user"

/** Builds a signed-looking JWT — the signature is never verified client-side. */
const buildToken = (payload: Record<string, unknown>): string => {
  const encode = (value: object) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
      .replace(/=+$/, "")
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`
}

const inOneHour = () => Math.floor(Date.now() / 1000) + 3600
const oneHourAgo = () => Math.floor(Date.now() / 1000) - 3600

describe("decodeJwt", () => {
  it("splits a token into header, payload and signature", () => {
    const decoded = decodeJwt(buildToken({ sub: "42", roles: ["ROLE_USER"] }))

    expect(decoded.header.alg).toBe("HS256")
    expect(decoded.payload.sub).toBe("42")
    expect(decoded.payload.roles).toEqual(["ROLE_USER"])
    expect(decoded.signature).toBe("signature")
  })

  it("decodes non-ASCII claims", () => {
    expect(decodeJwt(buildToken({ name: "Zoé Ünal" })).payload.name).toBe("Zoé Ünal")
  })

  it("throws on a token that is not made of three parts", () => {
    expect(() => decodeJwt("not.a-jwt")).toThrow()
  })
})

describe("isLogged", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("is false when no token is stored", () => {
    expect(isLogged()).toBe(false)
  })

  it("is true for a token that has not expired", () => {
    setUserToken({ token: buildToken({ exp: inOneHour() }) })
    expect(isLogged()).toBe(true)
  })

  it("is false once the token has expired", () => {
    setUserToken({ token: buildToken({ exp: oneHourAgo() }) })
    expect(isLogged()).toBe(false)
  })

  it("is false for a token carrying no expiry at all", () => {
    // A token that never expires cannot be trusted to end a session, so it is
    // treated as not signed in rather than as valid forever.
    setUserToken({ token: buildToken({ sub: "42" }) })
    expect(isLogged()).toBe(false)
  })
})

describe("hasRole", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("finds a role held by a valid token", () => {
    setUserToken({ token: buildToken({ exp: inOneHour(), roles: ["ROLE_ADMIN"] }) })
    expect(hasRole("ROLE_ADMIN")).toBe(true)
  })

  it("is false for a role the token does not carry", () => {
    setUserToken({ token: buildToken({ exp: inOneHour(), roles: ["ROLE_USER"] }) })
    expect(hasRole("ROLE_ADMIN")).toBe(false)
  })

  it("is false once the token expired, even though it lists the role", () => {
    // An expired token must grant nothing, whatever its claims say.
    setUserToken({ token: buildToken({ exp: oneHourAgo(), roles: ["ROLE_ADMIN"] }) })
    expect(hasRole("ROLE_ADMIN")).toBe(false)
  })

  it("is false when the token carries no roles", () => {
    setUserToken({ token: buildToken({ exp: inOneHour() }) })
    expect(hasRole("ROLE_USER")).toBe(false)
  })
})

describe("stored user", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns the stored user while the session is valid", () => {
    setUserToken({ token: buildToken({ exp: inOneHour() }) })
    setUserInLocalStorage({
      "@id": "/api/users/42",
      email: "sam@example.com",
      firstName: "Sam",
      lastName: null,
    })

    expect(getUserInLocalStorage()?.email).toBe("sam@example.com")
  })

  it("hides the stored user once the session expired", () => {
    // The profile outlives the token in storage; reading it back must not
    // resurrect a session that is over.
    setUserToken({ token: buildToken({ exp: oneHourAgo() }) })
    setUserInLocalStorage({
      "@id": "/api/users/42",
      email: "sam@example.com",
      firstName: "Sam",
      lastName: null,
    })

    expect(getUserInLocalStorage()).toBeUndefined()
  })

  it("keeps application-specific fields carried on the user", () => {
    setUserToken({ token: buildToken({ exp: inOneHour() }) })
    setUserInLocalStorage({
      "@id": "/api/users/42",
      email: "sam@example.com",
      firstName: null,
      lastName: null,
      subscriptionTier: "pro",
    })

    expect(getUserInLocalStorage()?.subscriptionTier).toBe("pro")
  })
})

describe("logout", () => {
  it("clears both the token and the stored profile", () => {
    localStorage.clear()
    setUserToken({ token: buildToken({ exp: inOneHour() }) })
    setUserInLocalStorage({
      "@id": "/api/users/42",
      email: "sam@example.com",
      firstName: null,
      lastName: null,
    })

    logout()

    expect(getUserToken()).toBeUndefined()
    expect(getTokenDecrypted()).toBeUndefined()
    expect(isLogged()).toBe(false)
  })
})
