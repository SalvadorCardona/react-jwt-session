import { ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { UserContext } from "./UserContext"
import {
  getUserInLocalStorage,
  setUserInLocalStorage,
  UserInterface,
} from "@/user"
import { getUserConfig, UserContextInterface } from "@/UserConfig"
import { LoginRequestInterface } from "@/LoginRequestInterface"
import { isLogged } from "@/isLogged"
import { setUserToken } from "@/UserToken"

interface UserProviderProps {
  children: ReactNode
  context?: Partial<UserContextInterface>
}

export const UserProvider = ({
  children,
  context: baseContext,
}: UserProviderProps) => {
  const userConfig = {
    ...getUserConfig(),
    ...baseContext,
  } as UserContextInterface

  const [user, setUser] = useState<UserInterface | undefined>(undefined)
  const hasFetched = useRef<boolean>(false)

  const updateUser = useCallback((newUser: UserInterface | undefined) => {
    if (!newUser) {
      userConfig.logout()
    }
    setUserInLocalStorage(newUser as UserInterface)
    setUser(newUser)
  }, [])

  const authenticator = useCallback(
    async (loginRequest: LoginRequestInterface) => {
      const loginResponse = await userConfig.authenticator(loginRequest)

      if (userConfig.getUser) {
        const authenticatedUser = await userConfig.getUser()
        updateUser(authenticatedUser)

        if (userConfig.onLoginSuccess && authenticatedUser) {
          await userConfig.onLoginSuccess({ user: authenticatedUser })
        }
      }

      return loginResponse
    },
    [userConfig, updateUser]
  )

  const getUser = useCallback(async () => {
    if (!user) {
      const currentUser = await userConfig.getUser()
      updateUser(currentUser)
      return currentUser
    }
    return user
  }, [user, userConfig, updateUser])

  const refreshUser = useCallback(async () => {
    let refreshedUser: UserInterface | undefined = undefined
    try {
      refreshedUser = await userConfig.getUser()
    } catch {
      console.warn("user not found")
    }

    updateUser(refreshedUser)
    return refreshedUser
  }, [user, userConfig, updateUser])

  const uriId = useCallback(() => getUserInLocalStorage()?.["@id"], [])

  const authenticatorWithJwt = async (token: string) => {
    setUserToken({ token })
    const user = await refreshUser()
    if (!user) {
      throw new Error("Authentification with jwt has failed")
    }
    await userConfig.onLoginSuccess({ user })
    return user
  }

  useEffect(() => {
    if (!user && isLogged()) {
      if (!hasFetched.current) {
        hasFetched.current = true
        refreshUser()
      }
    }
  }, [user])

  // Lets the application follow the session — attaching the user to an error
  // reporter, resetting analytics… The library stays unaware of which tool that
  // is; it only reports who is signed in, and `null` once they are not.
  useEffect(() => {
    userConfig.onUserChange?.(user ?? null)
  }, [user])

  return (
    <UserContext.Provider
      value={{
        ...userConfig,
        user,
        uriId,
        refreshUser,
        getUser,
        authenticator,
        authenticatorWithJwt,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}
