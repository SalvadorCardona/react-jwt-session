/** Clears the stored token and user profile. */
import { removeInStorage } from "ssr-safe-storage"
import { keyStorageUser, userKey } from "@/storageKeys"

export function logout(): void {
  removeInStorage(keyStorageUser)
  removeInStorage(userKey)
}
