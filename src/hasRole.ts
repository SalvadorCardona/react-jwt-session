import { getTokenDecrypted } from "@/getTokenDecrypted"
import { isLogged } from "@/isLogged"

export function hasRole(role: string): boolean {
  if (!isLogged()) return false

  const tokenDecrypted = getTokenDecrypted()

  const roles = tokenDecrypted?.payload.roles
  return !!(roles && roles.includes(role))
}
