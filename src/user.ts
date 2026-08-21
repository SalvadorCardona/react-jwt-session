import { getInStorage, setInStorage } from "ssr-safe-storage"
import { isLogged } from "@/isLogged"
import { userKey } from "@/storageKeys"

export { userKey } from "@/storageKeys"

/**
 * The signed-in user, reduced to what a session needs to know.
 *
 * The index signature is deliberate: applications carry their own fields on the
 * user — a subscription tier, a locale, a company — and should not have to fork
 * this type to keep them.
 */
export interface UserInterface {
  "@id": string
  firstName: string | null
  lastName: string | null
  email: string
  role?: string | null

  [key: string]: unknown
}

export const getUserInLocalStorage = (): undefined | UserInterface => {
  const user = getInStorage(userKey)
  if (!isLogged()) {
    return undefined
  }

  return user ? (user as UserInterface) : undefined
}

export const setUserInLocalStorage = (user: UserInterface): void => {
  setInStorage(userKey, user)
}
