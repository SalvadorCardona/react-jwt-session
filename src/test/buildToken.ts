/** Builds a signed-looking JWT — the signature is never verified client-side. */
export const buildToken = (payload: Record<string, unknown>): string => {
  const encode = (value: object) =>
    btoa(
      String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value)))
    ).replace(/=+$/, "")
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`
}

/** Seconds since the epoch, `seconds` from now. */
export const expiresIn = (seconds: number) => Math.floor(Date.now() / 1000) + seconds
