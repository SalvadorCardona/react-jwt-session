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
  logout: () => void
  uriId: () => string | null | undefined
  setUser: (user: UserInterface) => void
  refreshUser?: () => Promise<UserInterface | undefined>
  authenticatorWithJwt: (token: string) => Promise<UserInterface | undefined>
  authenticator: (
    loginRequestInterface: LoginRequestInterface
  ) => Promise<LoginReponseInterface>
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

export function setUserConfig(newConfig: UserContextInterface) {
  config = deepMerge(config, newConfig)

  return config as Required<UserContextInterface>
}
