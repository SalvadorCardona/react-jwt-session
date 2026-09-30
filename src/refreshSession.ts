import { setUserToken } from "@/UserToken"
import { clearRefreshToken, getRefreshToken, setRefreshToken } from "@/refreshToken"
import {
  getRefreshTokenRequest,
  getRevokeRefreshToken,
} from "@/refreshTokenTransport"

/**
 * Exchanges the refresh token for a new JWT.
 *
 * The API hands out a new refresh token along the way — the previous one is
 * worth nothing anymore — and both are replaced together in storage. Open tabs
 * read the same entry on every request: they follow without doing anything.
 *
 * A refusal (a revoked, expired or replayed token) clears the refresh token:
 * there is no session left to extend, no point retrying on every request.
 */
export async function refreshSession(): Promise<boolean> {
  // Several calls can cross — a timer and a tab coming back, for instance. The
  // first does the work, the others wait for its result: otherwise the second
  // would present a token the first has just consumed.
  pendingRefresh ??= exchangeRefreshToken().finally(() => {
    pendingRefresh = undefined
  })

  return pendingRefresh
}

/** Ends the session on the API, after forgetting the refresh token. */
export async function endSession(): Promise<void> {
  const refreshToken = getRefreshToken()
  clearRefreshToken()

  if (!refreshToken) return

  try {
    await getRevokeRefreshToken()?.(refreshToken)
  } catch {
    // Signing out must never fail: the token already left the browser, and the
    // one left in the database will expire on its own.
  }
}

let pendingRefresh: Promise<boolean> | undefined

async function exchangeRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  const request = getRefreshTokenRequest()

  if (!refreshToken || !request) return false

  let response

  try {
    response = await request(refreshToken)
  } catch {
    // Unreachable network: the token stays, the next attempt may succeed.
    // Clearing it here would sign out for a passing outage.
    return false
  }

  if ("token" in response && response.token && response.refreshToken) {
    setUserToken({ token: response.token })
    setRefreshToken(response.refreshToken)

    return true
  }

  // The API judged the token and turned it down: it is worth nothing anymore. A
  // failure on its side (5xx), however, says nothing of its validity — keep it.
  if (!("status" in response) || response.status < 500) clearRefreshToken()

  return false
}
