import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { invalidateSession, loadSession } from "@/loadSession"
import { getRefreshToken, setRefreshToken } from "@/refreshToken"
import { setUserToken } from "@/UserToken"
import { setUserInLocalStorage } from "@/user"
import { setUserConfig } from "@/UserConfig"
import { buildToken, expiresIn } from "@/test/buildToken"

const request = vi.fn()

const sam = {
  "@id": "/api/users/42",
  email: "sam@example.com",
  firstName: "Sam",
  lastName: null,
}

describe("loadSession", () => {
  beforeEach(() => {
    localStorage.clear()
    invalidateSession()
    request.mockReset()
    setUserConfig({ refreshTokenRequest: request })
  })

  afterEach(() => {
    setUserConfig({ refreshTokenRequest: undefined })
  })

  it("resolves null without a token", async () => {
    await expect(loadSession()).resolves.toBeNull()
    expect(request).not.toHaveBeenCalled()
  })

  it("reads the user, the roles and the token of a valid JWT", async () => {
    const token = buildToken({ exp: expiresIn(3600), roles: ["ROLE_ADMIN"] })
    setUserToken({ token })
    setUserInLocalStorage(sam)

    await expect(loadSession()).resolves.toEqual({
      user: sam,
      roles: ["ROLE_ADMIN"],
      token,
    })
    expect(request).not.toHaveBeenCalled()
  })

  it("renews an expired JWT before reading it", async () => {
    const renewed = buildToken({ exp: expiresIn(3600), roles: ["ROLE_USER"] })
    setUserToken({ token: buildToken({ exp: expiresIn(-60) }) })
    setRefreshToken("current")
    request.mockResolvedValue({ token: renewed, refreshToken: "renewed" })

    const session = await loadSession()

    expect(request).toHaveBeenCalledWith("current")
    expect(session?.token).toBe(renewed)
    expect(session?.roles).toEqual(["ROLE_USER"])
  })

  it("renews a JWT about to expire", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(60) }) })
    setRefreshToken("current")
    request.mockResolvedValue({
      token: buildToken({ exp: expiresIn(3600) }),
      refreshToken: "renewed",
    })

    await loadSession()

    expect(request).toHaveBeenCalledTimes(1)
  })

  it("resolves null when an expired JWT cannot be renewed", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(-60) }) })
    setRefreshToken("revoked")
    request.mockResolvedValue({ status: 401 })

    await expect(loadSession()).resolves.toBeNull()
    expect(getRefreshToken()).toBeUndefined()
  })

  it("resolves null when the API cannot be reached and the JWT expired", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(-60) }) })
    setRefreshToken("current")
    request.mockRejectedValue(new TypeError("Failed to fetch"))

    await expect(loadSession()).resolves.toBeNull()
    expect(getRefreshToken()).toBe("current")
  })

  it("keeps a JWT about to expire when its renewal fails", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(60) }) })
    setRefreshToken("current")
    request.mockRejectedValue(new TypeError("Failed to fetch"))

    await expect(loadSession()).resolves.not.toBeNull()
  })

  it("is kept for as long as the token does not change", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(3600) }) })

    const first = loadSession()

    expect(loadSession()).toBe(first)

    setUserToken({ token: buildToken({ exp: expiresIn(7200) }) })

    expect(loadSession()).not.toBe(first)
  })

  it("is read again once invalidated", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(3600) }) })
    expect((await loadSession())?.user).toBeNull()

    setUserInLocalStorage(sam)
    expect((await loadSession())?.user).toBeNull()

    invalidateSession()
    expect((await loadSession())?.user).toEqual(sam)
  })

  it("shares a single renewal between concurrent reads", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(-60) }) })
    setRefreshToken("current")
    request.mockResolvedValue({
      token: buildToken({ exp: expiresIn(3600) }),
      refreshToken: "renewed",
    })

    await Promise.all([loadSession(), loadSession()])

    expect(request).toHaveBeenCalledTimes(1)
  })
})
