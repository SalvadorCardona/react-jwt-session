# react-jwt-session

## 0.2.0

### Minor Changes

- 26996e1: Initial release: JWT session handling for React — token storage, expiry and role
  checks, the signed-in user, and a provider exposing all of it.

  Reporting the session to an error reporter goes through the `onUserChange`
  callback rather than a hardcoded dependency, and `UserInterface` carries an
  index signature so applications can keep their own fields on the user.

  Covered by 15 tests, where the module previously had none: an expired token
  grants no role and hides the stored profile, and a token with no expiry claim
  counts as signed out.
