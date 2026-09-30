import { getTokenDecrypted } from "@/getTokenDecrypted"
import { getUserConfig } from "@/UserConfig"

/** Margin taken on the JWT's expiry, so as never to rely on the exact second. */
export const defaultRenewalMargin = 120_000

export function getRenewalMargin(): number {
  return getUserConfig().renewalMargin ?? defaultRenewalMargin
}

/**
 * Time left to the JWT. Zero when there is none, or when it cannot be read: in
 * both cases, a renewal is due.
 */
export function millisecondsBeforeExpiry(): number {
  try {
    const expiry = getTokenDecrypted()?.payload.exp

    return expiry ? Math.max(expiry * 1000 - Date.now(), 0) : 0
  } catch {
    return 0
  }
}
