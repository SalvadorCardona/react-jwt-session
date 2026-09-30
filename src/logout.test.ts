import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { logout } from "@/logout"
import { getRefreshToken, setRefreshToken } from "@/refreshToken"
import { getUserToken, setUserToken } from "@/UserToken"
import { setUserConfig } from "@/UserConfig"
import { getUserInLocalStorage, setUserInLocalStorage } from "@/user"
import { loadSession } from "@/loadSession"
import { buildToken, expiresIn } from "@/test/buildToken"

const revoke = vi.fn()

describe("logout", () => {
  beforeEach(() => {
    localStorage.clear()
    revoke.mockReset()
    setUserConfig({ revokeRefreshToken: revoke })
    setUserToken({
      token: buildToken({ exp: expiresIn(3600) }),
      refreshToken: "current",
    })
    setUserInLocalStorage({
      "@id": "/api/users/42",
      email: "sam@example.com",
      firstName: null,
      lastName: null,
    })
  })

  afterEach(() => {
    setUserConfig({ revokeRefreshToken: undefined })
  })

  it("revokes the refresh token on the API", async () => {
    await logout()

    expect(revoke).toHaveBeenCalledWith("current")
  })

  // 0.1 callers do not await it: the session must be over as soon as it returns.
  it("clears the storage without being awaited", () => {
    revoke.mockReturnValue(new Promise(() => {}))

    void logout()

    expect(getUserToken()).toBeUndefined()
    expect(getRefreshToken()).toBeUndefined()
    expect(getUserInLocalStorage()).toBeUndefined()
  })

  it("never rejects, even when the revocation fails", async () => {
    revoke.mockRejectedValue(new TypeError("Failed to fetch"))

    await expect(logout()).resolves.toBeUndefined()
    expect(getUserToken()).toBeUndefined()
  })

  it("clears the storage without any transport configured", async () => {
    setUserConfig({ revokeRefreshToken: undefined })

    await logout()

    expect(getUserToken()).toBeUndefined()
    expect(getRefreshToken()).toBeUndefined()
  })

  it("ends the session loadSession remembered", async () => {
    expect(await loadSession()).not.toBeNull()

    await logout()

    expect(await loadSession()).toBeNull()
  })
})

describe("setUserToken", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("stores the refresh token of a login response apart from the JWT", () => {
    setUserToken({ token: "jwt", refreshToken: "refresh" })

    expect(getUserToken()).toBe("jwt")
    expect(getRefreshToken()).toBe("refresh")
    expect(JSON.parse(localStorage.getItem("jwt-token")!)).toEqual({ token: "jwt" })
  })

  // Impersonation and social sign-ins set a bare JWT: the renewal survives it.
  it("keeps the stored refresh token when the response carries none", () => {
    setRefreshToken("refresh")

    setUserToken({ token: "jwt" })

    expect(getRefreshToken()).toBe("refresh")
  })
})
