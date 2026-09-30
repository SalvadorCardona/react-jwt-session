import { refreshSession } from "@/refreshSession"
import { getRefreshToken } from "@/refreshToken"
import { getRenewalMargin, millisecondsBeforeExpiry } from "@/sessionExpiry"

/**
 * Keeps the session open for as long as a refresh token allows it.
 *
 * A JWT only lives so long: without this, an application left open — or
 * reopened the next day — would send back to the sign-in page. Renewal is
 * therefore asked for before the expiry, and each time the tab becomes active
 * again: a machine put to sleep lets the time pass without its timer noticing.
 *
 * Nothing is attempted without a refresh token: a visitor who never opened a
 * session triggers no call. Nothing either outside the browser.
 */
export function keepSessionAlive(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()

  if (!isWatching) {
    isWatching = true
    document.addEventListener("visibilitychange", () => {
      if ("visible" === document.visibilityState) void renewIfNeeded()
    })
    window.addEventListener("online", () => void renewIfNeeded())
  }

  return renewIfNeeded()
}

let isWatching = false
let renewal: ReturnType<typeof setTimeout> | undefined

async function renewIfNeeded(): Promise<void> {
  clearTimeout(renewal)

  if (!getRefreshToken()) return

  if (millisecondsBeforeExpiry() <= getRenewalMargin()) {
    await refreshSession()
  }

  scheduleRenewal()
}

function scheduleRenewal(): void {
  if (!getRefreshToken()) return

  const delay = millisecondsBeforeExpiry() - getRenewalMargin()

  renewal = setTimeout(() => void renewIfNeeded(), Math.max(delay, 60_000))
}
