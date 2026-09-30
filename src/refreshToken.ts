import { getInStorage, removeInStorage, setInStorage } from "ssr-safe-storage"
import { refreshTokenKey } from "@/storageKeys"

export function getRefreshToken(): string | undefined {
  return getInStorage<string>(refreshTokenKey) ?? undefined
}

/** Stores the refresh token; an empty value clears it. */
export function setRefreshToken(refreshToken: string | undefined): void {
  if (!refreshToken) {
    removeInStorage(refreshTokenKey)

    return
  }

  setInStorage(refreshTokenKey, refreshToken)
}

export function clearRefreshToken(): void {
  removeInStorage(refreshTokenKey)
}
