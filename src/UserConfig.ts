import { LoginRequestInterface } from "@/LoginRequestInterface"
import { LoginReponseInterface } from "@/LoginReponseInterface"
import {
  getUserInLocalStorage,
  setUserInLocalStorage,
  UserInterface,
} from "@/user"
import { deepMerge } from "@/deepMerge"
import { logout } from "@/logout"
import { getUserToken, setUserToken } from "@/UserToken"
import { hasRole } from "@/hasRole"

/**
 * What the API answers to a refresh token: a fresh pair, or — when it turns the
 * token down or fails — the HTTP status it answered with.
 */
export type RefreshTokenResponse =
  { token: string; refreshToken: string } | { status: number }

export interface UserContextInterface {
  onLoginSuccess: (context: { user: UserInterface }) => Promise<void>

  /**
   * Called whenever the signed-in user changes, with `null` on sign-out.
   *
   * Use it to mirror the session into whatever the application already has —
   * an error reporter, analytics, a logger:
   *
   * ```ts
   * setUserConfig({
   *   onUserChange: (user) =>
   *     Sentry.setUser(user && { id: user["@id"], email: user.email }),
   * })
   * ```
   */
  onUserChange?: (user: UserInterface | null) => void
  user: UserInterface | undefined
  getUser: () => Promise<UserInterface | undefined>
  hasRole: (role: string) => boolean
  logout: () => void | Promise<void>
  uriId: () => string | null | undefined
  setUser: (user: UserInterface) => void
  refreshUser?: () => Promise<UserInterface | undefined>
  authenticatorWithJwt: (token: string) => Promise<UserInterface | undefined>
  authenticator: (
    loginRequestInterface: LoginRequestInterface
  ) => Promise<LoginReponseInterface>

  /**
   * Exchanges a refresh token for a new JWT and a new refresh token.
   *
   * Resolve `{ status }` when the API answers without a pair, and reject when it
   * cannot be reached: a 4xx drops the refresh token, a 5xx or a network failure
   * keeps it. Takes precedence over `refreshUrl`.
   */
  refreshTokenRequest?: (refreshToken: string) => Promise<RefreshTokenResponse>

  /** Revokes a refresh token on the API. Takes precedence over `logoutUrl`. */
  revokeRefreshToken?: (refreshToken: string) => Promise<void>

  /**
   * Where the default transport posts `{ refreshToken }`, expecting
   * `{ token, refreshToken }` back — e.g. `/api/auth/refresh`.
   */
  refreshUrl?: string

  /** Where the default transport posts `{ refreshToken }` to revoke it. */
  logoutUrl?: string

  /**
   * How long before the JWT expires it gets renewed, in milliseconds.
   * Defaults to two minutes.
   */
  renewalMargin?: number
}

let config: UserContextInterface = {
  authenticator: async () => {
    return { token: "" }
  },
  onLoginSuccess: async () => {},
  user: undefined,
  getUser: async () => {
    const user = getUserInLocalStorage()
    if (!user) throw new Error("User not found")

    return user
  },
  logout: logout,
  authenticatorWithJwt: async (token: string) => {
    setUserToken({ token })

    return getUserInLocalStorage()
  },
  hasRole: function (role: string): boolean {
    return hasRole(role)
  },
  uriId: function (): string | null | undefined {
    return getUserToken()
  },
  setUser: function (user: UserInterface): void {
    setUserInLocalStorage(user)
  },
}

export function getUserConfig(): UserContextInterface {
  return config
}

/**
 * Overrides part of the configuration; whatever is left out keeps its current
 * value, since the new settings are merged into the existing ones.
 */
export function setUserConfig(newConfig: Partial<UserContextInterface>) {
  config = deepMerge(config, newConfig as UserContextInterface)

  return config as Required<UserContextInterface>
}
