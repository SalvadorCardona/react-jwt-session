import { ForbiddenError, UnauthorizedError } from "react-resource-view"
import { loadSession } from "@/loadSession"

export interface ScopeAuthorizationOptions {
  /** Grants access to a session holding any of these roles. */
  roles?: string[]
}

/**
 * Builds a react-resource-view scope authorization out of the session:
 *
 * ```ts
 * authorization: createScopeAuthorization({ roles: ["ROLE_ADMIN"] })
 * ```
 *
 * Nobody signed in — or a session that could not be renewed — throws an
 * `UnauthorizedError` (401, `onUnauthorized`); a session without any of the
 * roles throws a `ForbiddenError` (403, `forbiddenFallback`).
 */
export function createScopeAuthorization({
  roles,
}: ScopeAuthorizationOptions = {}): () => Promise<boolean> {
  return async () => {
    const session = await loadSession()

    if (!session) throw new UnauthorizedError()

    if (roles?.length && !roles.some((role) => session.roles.includes(role))) {
      throw new ForbiddenError()
    }

    return true
  }
}
