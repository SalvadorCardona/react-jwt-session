import { getInStorage, setInStorage } from "universal-web-storage"
import { keyStorageUser } from "@/storageKeys"
import { LoginReponseInterface } from "@/LoginReponseInterface"

export function getUserToken(): string | undefined {
  const userPayload = getInStorage<LoginReponseInterface>(keyStorageUser)

  if (!userPayload) {
    return undefined
  }

  return userPayload ? userPayload.token : undefined
}

export function setUserToken(loginReponse: LoginReponseInterface): void {
  setInStorage(keyStorageUser, loginReponse)
}
