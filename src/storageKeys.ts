/**
 * Keys under which the session is persisted.
 *
 * They live in their own module so the token helpers and the user helpers can
 * both reach them without importing each other — which used to form an import
 * cycle between `getTokenDecrypted` and `UserToken`.
 */

/** Key holding the JWT itself. */
export const keyStorageUser = "jwt-token"

/** Key holding the last known user profile. */
export const userKey = "user-key-storage"

/**
 * Key holding the refresh token.
 *
 * Kept apart from the JWT entry on purpose: that entry is rewritten whole each
 * time a token is set — a social sign-in, an impersonation — which would drop
 * the refresh token without a word if it travelled along.
 */
export const refreshTokenKey = "jwt-refresh-token"
