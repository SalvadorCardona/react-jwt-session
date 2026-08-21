import { decodeJwt } from "@/decodeJwt"
import { getUserToken } from "@/UserToken"

export { keyStorageUser } from "@/storageKeys"

export function getTokenDecrypted() {
  const token = getUserToken()

  if (!token) {
    return undefined
  }

  return decodeJwt(token)
}
