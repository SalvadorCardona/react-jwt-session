import { beforeEach, describe, expect, it } from "vitest"
import { ForbiddenError, UnauthorizedError } from "react-resource-view"
import { createScopeAuthorization } from "@/resource-view"
import { invalidateSession } from "@/loadSession"
import { setUserToken } from "@/UserToken"
import { buildToken, expiresIn } from "@/test/buildToken"

describe("createScopeAuthorization", () => {
  beforeEach(() => {
    localStorage.clear()
    invalidateSession()
  })

  it("answers 401 when nobody is signed in", async () => {
    await expect(createScopeAuthorization()()).rejects.toBeInstanceOf(
      UnauthorizedError
    )
  })

  it("answers 401 once the session expired", async () => {
    setUserToken({
      token: buildToken({ exp: expiresIn(-60), roles: ["ROLE_ADMIN"] }),
    })

    await expect(
      createScopeAuthorization({ roles: ["ROLE_ADMIN"] })()
    ).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it("answers 403 to a session without the role", async () => {
    setUserToken({
      token: buildToken({ exp: expiresIn(3600), roles: ["ROLE_USER"] }),
    })

    await expect(
      createScopeAuthorization({ roles: ["ROLE_ADMIN"] })()
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it("lets a session holding one of the roles in", async () => {
    setUserToken({
      token: buildToken({ exp: expiresIn(3600), roles: ["ROLE_EDITOR"] }),
    })

    await expect(
      createScopeAuthorization({ roles: ["ROLE_ADMIN", "ROLE_EDITOR"] })()
    ).resolves.toBe(true)
  })

  it("lets any signed-in session in when no role is asked", async () => {
    setUserToken({ token: buildToken({ exp: expiresIn(3600) }) })

    await expect(createScopeAuthorization()()).resolves.toBe(true)
  })
})
