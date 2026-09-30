import { getInStorage, setInStorage } from "ssr-safe-storage"
import { keyStorageUser } from "@/storageKeys"
import { LoginReponseInterface } from "@/LoginReponseInterface"
import { setRefreshToken } from "@/refreshToken"

export function getUserToken(): string | undefined {
  const userPayload = getInStorage<LoginReponseInterface>(keyStorageUser)

  if (!userPayload) {
    return undefined
  }

  return userPayload ? userPayload.token : undefined
}

/**
 * Stores the JWT, and the refresh token when the response carries one.
 *
 * A response without a refresh token leaves the stored one in place: the other
 * ways of setting a token (a social sign-in, a JWT handed over in a link) must
 * not end the session's renewal behind its back.
 */
export function setUserToken(loginReponse: LoginReponseInterface): void {
  const { refreshToken, ...userPayload } = loginReponse

  setInStorage(keyStorageUser, userPayload)

  if (refreshToken) setRefreshToken(refreshToken)
}
