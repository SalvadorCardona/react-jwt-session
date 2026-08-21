import { getTokenDecrypted } from "@/getTokenDecrypted"

export function isLogged(): boolean {
  const tokenDecrypted = getTokenDecrypted()

  if (!tokenDecrypted) return false

  if (!tokenDecrypted.payload.exp) return false

  return Date.now() <= tokenDecrypted.payload.exp * 1000
}
