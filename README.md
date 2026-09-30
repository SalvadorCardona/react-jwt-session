# react-jwt-session

JWT session handling for React: decode the token, read its roles, keep the
signed-in user around, and expose the whole thing through a provider.

This package deliberately stops at the client side of a session. It does not
sign anybody in by itself — you hand it an `authenticator` and a `getUser`, it
takes care of storing the token, telling whether the session is still valid, and
sharing the user with your component tree. The only calls it can make on its
own are the renewal and the revocation of a refresh token, and only once you
point it at them.

```tsx
import { setUserConfig, UserProvider, useUserContext } from "react-jwt-session"

setUserConfig({
  authenticator: ({ email, password }) => api.post("/login", { email, password }),
  getUser: () => api.get("/me"),
})

const App = () => (
  <UserProvider>
    <Profile />
  </UserProvider>
)

function Profile() {
  const { user, hasRole, logout } = useUserContext()
  if (!user) return <SignIn />
  return (
    <>
      <p>{user.email}</p>
      {hasRole("ROLE_ADMIN") && <AdminPanel />}
      <button onClick={logout}>Sign out</button>
    </>
  )
}
```

## Installation

```bash
pnpm add react-jwt-session ssr-safe-storage
```

`react` (18.3+ or 19) is a peer dependency; `react-resource-view` (0.12+) is an
optional one, needed only by the [`react-jwt-session/resource-view`](#with-react-resource-view)
helper;
[`ssr-safe-storage`](https://github.com/SalvadorCardona/ssr-safe-storage)
backs the persistence and keeps the same calls working during server-side
rendering.

## Configuration

`setUserConfig` wires the package to your API. Only `authenticator` and
`getUser` are really yours to provide; the rest has working defaults.

```ts
import { setUserConfig } from "react-jwt-session"

setUserConfig({
  // Exchanges credentials for a token
  authenticator: ({ email, password }) => api.post("/login", { email, password }),
  // Loads the signed-in user once the token is stored
  getUser: () => api.get("/me"),
  // Runs after a successful sign-in
  onLoginSuccess: async ({ user }) => router.navigate(`/${user.role}/dashboard`),
  // Mirrors the session wherever the application needs it
  onUserChange: (user) =>
    Sentry.setUser(user && { id: user["@id"], email: user.email }),
})
```

`onUserChange` is how the session reaches your error reporter, your analytics or
your logger. The library has no idea which tool that is: it only reports who is
signed in, and `null` once nobody is.

## API

### Session state

| Function | Purpose |
| --- | --- |
| `isLogged()` | Is a non-expired token stored? |
| `hasRole(role)` | Does the valid token carry this role? |
| `getUserToken()` | The raw JWT, if any |
| `setUserToken({ token, refreshToken? })` | Stores a token, and the refresh token when given |
| `getTokenDecrypted()` | The decoded token — header, payload, signature |
| `decodeJwt(token)` | Decodes any JWT without touching storage |
| `logout()` | Clears the token, the refresh token and the stored profile, then revokes the refresh token — see [below](#signing-out) |

Expiry is enforced on every read: an expired token grants no role, and the
stored profile stops being returned. A token carrying no `exp` claim at all is
treated as *not* signed in, since nothing would ever end that session.

Nothing here verifies the signature — that is the server's job. Client-side
checks decide what to *show*, never what to allow.

### Too many sign-in attempts

`TooManyLoginAttemptsError` tells a locked account apart from a wrong password:
the first only asks to wait. The package calls no login endpoint itself, so your
`authenticator` throws it when the API answers 429 — with the API's message,
which says how long to wait:

```ts
import { TooManyLoginAttemptsError } from "react-jwt-session"

setUserConfig({
  authenticator: async (credentials) => {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    })
    if (response.status === 429) {
      throw new TooManyLoginAttemptsError((await response.json()).message)
    }
    if (!response.ok) throw new Error("Authentication problem")
    const data = await response.json() // { token, refreshToken }
    setUserToken(data)
    return data
  },
})
```

### React

`UserProvider` restores the session on mount when a valid token is present, and
`useUserContext()` exposes it:

```ts
const {
  user, // UserInterface | undefined
  getUser, // loads it if not in memory yet
  refreshUser, // refetches from the API
  authenticator, // signs in with credentials
  authenticatorWithJwt, // signs in from an existing token (OAuth callback…)
  hasRole,
  logout,
  uriId, // the user's IRI
} = useUserContext()
```

`UserProvider` also accepts a `context` prop, overriding the global config for
one subtree — useful in tests and stories.

### The user type

`UserInterface` holds only what a session needs — `@id`, `email`, `firstName`,
`lastName`, `role` — plus an index signature, so your own fields ride along
without forking the type:

```ts
const { user } = useUserContext()
user.subscriptionTier // your field, kept as stored
```

## Refresh token

A LexikJWT token lives an hour. With a refresh token next to it, the session
outlives it: `setUserToken` stores the `refreshToken` of a login response under
its own key (`jwt-refresh-token`), apart from the JWT.

```ts
setUserToken({ token, refreshToken }) // e.g. the response of POST /api/auth
getRefreshToken() // string | undefined
setRefreshToken(refreshToken)
clearRefreshToken()
```

Setting a bare JWT afterwards — a social sign-in, an impersonation — leaves the
stored refresh token alone; `logout()` is what drops it.

The package needs to know how to reach your API. Having no HTTP client of its own,
it either `fetch`es two URLs:

```ts
setUserConfig({
  // POST { refreshToken } → { token, refreshToken }
  refreshUrl: "/api/auth/refresh",
  // POST { refreshToken }
  logoutUrl: "/api/auth/logout",
})
```

or calls your functions, which take precedence over the URLs — handy to go
through your own client and its base URL:

```ts
setUserConfig({
  refreshTokenRequest: async (refreshToken) => {
    const { data, response } = await client.POST("/api/auth/refresh", {
      body: { refreshToken },
    })
    return data ?? { status: response.status }
  },
  revokeRefreshToken: async (refreshToken) => {
    await client.POST("/api/auth/logout", { body: { refreshToken } })
  },
})
```

`refreshTokenRequest` resolves the new pair, or `{ status }` when the API
answers without one; it rejects when the API cannot be reached.

`refreshSession()` then exchanges the stored refresh token for a new pair and
resolves `true` on success:

- concurrent calls share a single exchange — the second would otherwise present
  a token the first has just consumed;
- a 4xx clears the refresh token: the API judged it, there is nothing left to
  renew;
- a 5xx or a network failure keeps it: an outage says nothing of its validity.

With no refresh token, or no transport configured, it resolves `false` without
calling anything.

## Keeping the session alive

```ts
import { keepSessionAlive } from "react-jwt-session"

// Once, at start-up, and after each sign-in.
void keepSessionAlive()
```

It renews the JWT two minutes before it expires, then schedules the next
renewal, and checks again whenever the tab becomes visible or the network comes
back — a machine put to sleep lets the hour pass without its timer noticing. It
does nothing on the server, nor without a refresh token. The margin is
configurable:

```ts
setUserConfig({ renewalMargin: 5 * 60_000 })
```

### Signing out

`logout()` clears the token, the refresh token and the profile at once, then
revokes the refresh token on the API when a transport is configured. It returns
a promise that never rejects: await it before navigating away so the revocation
gets sent, or keep calling it without `await` as in 0.1 — the storage is empty
as soon as it returns either way.

```ts
await logout()
window.location.href = "/"
```

## Async session

`loadSession()` resolves the session, renewing it first when the JWT has expired
or is about to and a refresh token allows it:

```ts
import { loadSession } from "react-jwt-session"

const session = await loadSession()
// { user, roles, token } — or null when nobody is signed in

session?.roles.includes("ROLE_ADMIN")
```

`user` is the stored profile (`null` until `getUser` has run), `roles` those of
the JWT. The result is kept for as long as the token does not change, so it can
be awaited on every navigation. `invalidateSession()` forces a new read — after a
sign-in, an impersonation, or anything that changes the stored profile.
`logout()` and `UserProvider` call it for you.

## With react-resource-view

The `react-jwt-session/resource-view` sub-path turns the session into the async
scope authorization that [react-resource-view](https://github.com/SalvadorCardona/react-resource-view)
0.12 expects — one line per scope:

```ts
import { createScopeAuthorization } from "react-jwt-session/resource-view"

export const adminScope: ScopeInterface = {
  name: "admin",
  // …
  authorization: createScopeAuthorization({ roles: ["ROLE_ADMIN"] }),
}
```

- nobody signed in, or a session that could not be renewed: throws
  `UnauthorizedError` (401) — react-resource-view calls `onUnauthorized`;
- a session holding none of the `roles`: throws `ForbiddenError` (403) — it
  renders `forbiddenFallback`;
- otherwise: `true`. Leave `roles` out to let any signed-in user in.

`react-resource-view` is an optional peer dependency: only this sub-path imports
it, the main entry never does.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## License

MIT
