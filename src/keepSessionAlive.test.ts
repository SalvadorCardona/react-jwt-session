import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { keepSessionAlive } from "@/keepSessionAlive"
import { getRefreshToken, setRefreshToken } from "@/refreshToken"
import { getUserToken, setUserToken } from "@/UserToken"
import { setUserConfig } from "@/UserConfig"
import { buildToken, expiresIn } from "@/test/buildToken"

const request = vi.fn()

/** A renewal answering with a JWT valid for an hour. */
const renewsForAnHour = () =>
  request.mockImplementation(async () => ({
    token: buildToken({ exp: expiresIn(3600) }),
    refreshToken: "renewed",
  }))

describe("keepSessionAlive", () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    localStorage.clear()
    request.mockReset()
    setUserConfig({ refreshTokenRequest: request })
    // Clears whatever timer a previous test left behind.
    await keepSessionAlive()
  })

  afterEach(() => {
    vi.useRealTimers()
    setUserConfig({ refreshTokenRequest: undefined, renewalMargin: undefined })
  })

  it("does nothing without a refresh token", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(-60) }) })

    await keepSessionAlive()
    await vi.advanceTimersByTimeAsync(3 * 3600_000)

    expect(request).not.toHaveBeenCalled()
  })

  it("renews at once a JWT that has expired", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(-60) }) })
    setRefreshToken("current")
    renewsForAnHour()

    await keepSessionAlive()

    expect(request).toHaveBeenCalledTimes(1)
    expect(getRefreshToken()).toBe("renewed")
  })

  it("renews two minutes before the expiry", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(3600) }) })
    setRefreshToken("current")
    renewsForAnHour()

    await keepSessionAlive()
    expect(request).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(3600_000 - 121_000)
    expect(request).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2_000)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it("keeps renewing for as long as the API agrees", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(3600) }) })
    setRefreshToken("current")
    renewsForAnHour()

    await keepSessionAlive()
    await vi.advanceTimersByTimeAsync(3 * 3600_000)

    expect(request).toHaveBeenCalledTimes(3)
  })

  it("takes the margin from the configuration", async () => {
    setUserConfig({ renewalMargin: 600_000 })
    setUserToken({ token: buildToken({ exp: expiresIn(3600) }) })
    setRefreshToken("current")
    renewsForAnHour()

    await keepSessionAlive()
    await vi.advanceTimersByTimeAsync(3600_000 - 600_000)

    expect(request).toHaveBeenCalledTimes(1)
  })

  // A machine put to sleep lets the hour pass without its timer noticing.
  it("renews when the tab becomes visible again", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(3600) }) })
    setRefreshToken("current")
    renewsForAnHour()
    await keepSessionAlive()

    setUserToken({ token: buildToken({ exp: expiresIn(-60) }) })
    document.dispatchEvent(new Event("visibilitychange"))
    await vi.advanceTimersByTimeAsync(0)

    expect(request).toHaveBeenCalledTimes(1)
  })

  it("renews when the network comes back", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(3600) }) })
    setRefreshToken("current")
    renewsForAnHour()
    await keepSessionAlive()

    setUserToken({ token: buildToken({ exp: expiresIn(-60) }) })
    window.dispatchEvent(new Event("online"))
    await vi.advanceTimersByTimeAsync(0)

    expect(request).toHaveBeenCalledTimes(1)
  })

  it("stops once the API turns the refresh token down", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(-60) }) })
    setRefreshToken("revoked")
    request.mockResolvedValue({ status: 401 })

    await keepSessionAlive()
    await vi.advanceTimersByTimeAsync(3 * 3600_000)

    expect(request).toHaveBeenCalledTimes(1)
    expect(getRefreshToken()).toBeUndefined()
  })

  it("does nothing outside the browser", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(-60) }) })
    setRefreshToken("current")
    vi.stubGlobal("window", undefined)

    try {
      await keepSessionAlive()
    } finally {
      vi.unstubAllGlobals()
    }

    expect(request).not.toHaveBeenCalled()
    expect(getUserToken()).toBeDefined()
  })
})
