import { getTokenDecrypted } from "@/getTokenDecrypted"
import { isLogged } from "@/isLogged"
import { refreshSession } from "@/refreshSession"
import { getRefreshToken } from "@/refreshToken"
import { getRenewalMargin, millisecondsBeforeExpiry } from "@/sessionExpiry"
import { getUserInLocalStorage, UserInterface } from "@/user"
import { getUserToken } from "@/UserToken"

export interface Session {
  /** The stored profile, `null` until the application has fetched it. */
  user: UserInterface | null
  /** The roles the JWT carries. */
  roles: string[]
  token: string
}

/**
 * Reads the session, renewing it first when the JWT has expired or is about to
 * and a refresh token allows it. Resolves `null` when nobody is signed in, and
 * never rejects.
 *
 * The result is kept for as long as the token does not change, so it can be
 * awaited on every navigation; `invalidateSession()` forces a new read.
 */
export function loadSession(): Promise<Session | null> {
  const token = getUserToken()

  // Close to its expiry, the token is read again each time: the session may
  // have to be renewed, or may be over.
  if (
    !cached ||
    cached.token !== token ||
    millisecondsBeforeExpiry() <= getRenewalMargin()
  ) {
    cached = { token, session: readSession() }
  }

  return cached.session
}

/** Forgets the session read last — after a sign-in, a sign-out, an impersonation. */
export function invalidateSession(): void {
  cached = undefined
}

let cached:
  { token: string | undefined; session: Promise<Session | null> } | undefined

async function readSession(): Promise<Session | null> {
  if (getRefreshToken() && millisecondsBeforeExpiry() <= getRenewalMargin()) {
    await refreshSession()
  }

  return currentSession()
}

function currentSession(): Session | null {
  const token = getUserToken()

  try {
    if (!token || !isLogged()) return null

    return {
      user: getUserInLocalStorage() ?? null,
      roles: getTokenDecrypted()?.payload.roles ?? [],
      token,
    }
  } catch {
    // A token that cannot be decoded opens no session.
    return null
  }
}
