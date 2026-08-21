import { createContext } from "react"
import { UserContextInterface } from "@/UserConfig"

export const UserContext = createContext<Partial<UserContextInterface>>({})
