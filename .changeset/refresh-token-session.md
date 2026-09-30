---
"react-jwt-session": minor
---

Covers the whole lifecycle of a LexikJWT session, without breaking the 0.1 API.

- Refresh token: `setUserToken({ token, refreshToken })` stores it under its own
  key; `getRefreshToken` / `setRefreshToken` / `clearRefreshToken`.
- Configurable transport, with no HTTP client dependency: `refreshTokenRequest`
  and `revokeRefreshToken` in `setUserConfig`, or a `fetch` on `refreshUrl` /
  `logoutUrl`.
- `refreshSession()`: concurrent calls share one exchange; a 4xx clears the
  refresh token, a 5xx or a network failure keeps it.
- `keepSessionAlive()`: renews before expiry (`renewalMargin`, two minutes by
  default), and again when the tab becomes visible or the network comes back.
- `logout()` now returns a promise: it revokes the refresh token on the API and
  never rejects. The storage is still cleared as soon as it is called.
- `loadSession()` resolves `{ user, roles, token }` or `null`, renewing first
  when needed; `invalidateSession()` forces a new read.
- `TooManyLoginAttemptsError` for a 429 on sign-in.
- New `react-jwt-session/resource-view` sub-path:
  `createScopeAuthorization({ roles })` protects a react-resource-view 0.12
  scope in one line. `react-resource-view` is an optional peer dependency, never
  imported by the main entry.
