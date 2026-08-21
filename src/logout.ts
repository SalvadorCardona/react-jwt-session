/** Clears the stored token and user profile. */
import { removeInStorage } from "universal-web-storage"
import { keyStorageUser, userKey } from "@/storageKeys"

export function logout(): void {
  removeInStorage(keyStorageUser)
  removeInStorage(userKey)
}
