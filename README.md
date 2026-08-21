# react-jwt-session

JWT session handling for React: decode the token, read its roles, keep the
signed-in user around, and expose the whole thing through a provider.

This package deliberately stops at the client side of a session. It never talks
to your API — you hand it an `authenticator` and a `getUser`, it takes care of
storing the token, telling whether the session is still valid, and sharing the
user with your component tree.

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
pnpm add react-jwt-session universal-web-storage
```

`react` (18.3+ or 19) is a peer dependency;
[`universal-web-storage`](https://github.com/SalvadorCardona/universal-web-storage)
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
| `setUserToken({ token })` | Stores a token |
| `getTokenDecrypted()` | The decoded token — header, payload, signature |
| `decodeJwt(token)` | Decodes any JWT without touching storage |
| `logout()` | Clears both the token and the stored profile |

Expiry is enforced on every read: an expired token grants no role, and the
stored profile stops being returned. A token carrying no `exp` claim at all is
treated as *not* signed in, since nothing would ever end that session.

Nothing here verifies the signature — that is the server's job. Client-side
checks decide what to *show*, never what to allow.

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
