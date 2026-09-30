# react-jwt-session

Client side of a LexikJWT session for React: storing the JWT and its refresh
token, reading roles and expiry, renewing, revoking, and sharing the user
through a provider. Published on npm; the public API is what `src/index.ts`
exports.

## Commands

```bash
pnpm test        # Vitest (jsdom)
pnpm typecheck
pnpm lint
pnpm build       # tsdown → dist/
pnpm run ci      # all four, as the CI runs them
```

## Layout

- One function (or a tight group) per module under `src/`, imported through the
  `@/` alias and re-exported from `src/index.ts`.
- Everything persistent goes through `ssr-safe-storage`, under the keys of
  `src/storageKeys.ts`. The refresh token has its own key, apart from the JWT
  entry that `setUserToken` rewrites whole.
- `src/resource-view/` is the `react-jwt-session/resource-view` sub-path: a
  separate tsdown entry, and the only code allowed to import
  `react-resource-view` (an optional peer). `src/entryIsolation.test.ts` fails
  if the main entry ever reaches it. Both entries share one chunk, hence one
  session state.

## Rules

- No breaking change to the 0.1 API: Opoil and Animalink upgrade without
  touching their code. New settings are optional entries of `setUserConfig`.
- No HTTP client dependency. The only calls the package makes are the refresh
  and revocation of a refresh token, through `refreshTokenRequest` /
  `revokeRefreshToken` or a plain `fetch` on `refreshUrl` / `logoutUrl`.
- Refresh semantics: concurrent `refreshSession()` calls share one exchange; a
  4xx clears the refresh token, a 5xx or a network failure keeps it.
- `logout()` clears the storage synchronously, before its first `await`, and
  never rejects.
- Releases go through changesets: add one with `pnpm changeset`; merging the
  "Version Packages" PR publishes to npm.
