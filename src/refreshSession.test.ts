import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { endSession, refreshSession } from "@/refreshSession"
import { getRefreshToken, setRefreshToken } from "@/refreshToken"
import { getUserToken, setUserToken } from "@/UserToken"
import { setUserConfig } from "@/UserConfig"

const request = vi.fn()
const revoke = vi.fn()

describe("refreshSession", () => {
  beforeEach(() => {
    localStorage.clear()
    request.mockReset()
    setUserConfig({ refreshTokenRequest: request })
  })

  afterEach(() => {
    setUserConfig({ refreshTokenRequest: undefined })
  })

  it("asks nothing without a refresh token", async () => {
    await expect(refreshSession()).resolves.toBe(false)
    expect(request).not.toHaveBeenCalled()
  })

  it("replaces both the JWT and the refresh token", async () => {
    setRefreshToken("old")
    request.mockResolvedValue({ token: "new-jwt", refreshToken: "new" })

    await expect(refreshSession()).resolves.toBe(true)
    expect(request).toHaveBeenCalledWith("old")
    expect(getUserToken()).toBe("new-jwt")
    expect(getRefreshToken()).toBe("new")
  })

  // Two timers crossing must not present the same token twice: the second call
  // waits for the result of the first.
  it("runs a single exchange at a time", async () => {
    setRefreshToken("old")
    request.mockResolvedValue({ token: "new-jwt", refreshToken: "new" })

    const results = await Promise.all([refreshSession(), refreshSession()])

    expect(results).toEqual([true, true])
    expect(request).toHaveBeenCalledTimes(1)
  })

  it("forgets a refresh token the API turns down", async () => {
    setRefreshToken("revoked")
    request.mockResolvedValue({ status: 401 })

    await expect(refreshSession()).resolves.toBe(false)
    expect(getRefreshToken()).toBeUndefined()
  })

  // An API failure says nothing of the token's validity: keeping it avoids
  // signing everybody out for the length of an incident.
  it("keeps the refresh token when the API fails", async () => {
    setRefreshToken("valid")
    request.mockResolvedValue({ status: 503 })

    await expect(refreshSession()).resolves.toBe(false)
    expect(getRefreshToken()).toBe("valid")
  })

  // A network outage is not a refusal: the session must survive the tunnel.
  it("keeps the refresh token when the API cannot be reached", async () => {
    setRefreshToken("valid")
    request.mockRejectedValue(new TypeError("Failed to fetch"))

    await expect(refreshSession()).resolves.toBe(false)
    expect(getRefreshToken()).toBe("valid")
  })

  it("leaves the JWT alone when the exchange fails", async () => {
    setUserToken({ token: "current-jwt" })
    setRefreshToken("revoked")
    request.mockResolvedValue({ status: 401 })

    await refreshSession()

    expect(getUserToken()).toBe("current-jwt")
  })
})

describe("default transport", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    setUserConfig({ refreshUrl: "/api/auth/refresh", logoutUrl: "/api/auth/logout" })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setUserConfig({ refreshUrl: undefined, logoutUrl: undefined })
  })

  it("posts the refresh token to refreshUrl", async () => {
    setRefreshToken("old")
    fetchMock.mockResolvedValue(
      Response.json({ token: "new-jwt", refreshToken: "new" })
    )

    await expect(refreshSession()).resolves.toBe(true)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/auth/refresh")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({ refreshToken: "old" })
    expect(getUserToken()).toBe("new-jwt")
    expect(getRefreshToken()).toBe("new")
  })

  it("reads a refusal from the HTTP status", async () => {
    setRefreshToken("revoked")
    fetchMock.mockResolvedValue(Response.json({ message: "nope" }, { status: 401 }))

    await expect(refreshSession()).resolves.toBe(false)
    expect(getRefreshToken()).toBeUndefined()
  })

  it("keeps the refresh token on a 5xx", async () => {
    setRefreshToken("valid")
    fetchMock.mockResolvedValue(new Response(null, { status: 502 }))

    await expect(refreshSession()).resolves.toBe(false)
    expect(getRefreshToken()).toBe("valid")
  })

  it("revokes the refresh token on logoutUrl", async () => {
    setRefreshToken("current")
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await endSession()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/auth/logout")
    expect(JSON.parse(init.body)).toEqual({ refreshToken: "current" })
  })
})

describe("endSession", () => {
  beforeEach(() => {
    localStorage.clear()
    revoke.mockReset()
    setUserConfig({ revokeRefreshToken: revoke })
  })

  afterEach(() => {
    setUserConfig({ revokeRefreshToken: undefined })
  })

  it("revokes the refresh token and forgets it", async () => {
    setRefreshToken("current")

    await endSession()

    expect(revoke).toHaveBeenCalledWith("current")
    expect(getRefreshToken()).toBeUndefined()
  })

  it("calls nothing without a refresh token", async () => {
    await endSession()
    expect(revoke).not.toHaveBeenCalled()
  })

  it("never fails, even when the API cannot be reached", async () => {
    setRefreshToken("current")
    revoke.mockRejectedValue(new TypeError("Failed to fetch"))

    await expect(endSession()).resolves.toBeUndefined()
    expect(getRefreshToken()).toBeUndefined()
  })
})
