import { removeInStorage } from "ssr-safe-storage"
import { keyStorageUser, userKey } from "@/storageKeys"
import { endSession } from "@/refreshSession"
import { invalidateSession } from "@/loadSession"

/**
 * Clears the stored token, refresh token and user profile, then revokes the
 * refresh token on the API when a transport is configured.
 *
 * The storage is cleared before the first `await`: called without awaiting it,
 * as in 0.1, the session is over as soon as it returns. The promise never
 * rejects.
 */
export function logout(): Promise<void> {
  const revocation = endSession()

  removeInStorage(keyStorageUser)
  removeInStorage(userKey)
  invalidateSession()

  return revocation
}
