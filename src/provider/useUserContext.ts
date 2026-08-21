import { use } from "react"
import { UserContext } from "@/provider/UserContext"
import { UserContextInterface } from "@/UserConfig"

export default function useUserContext() {
  return use(UserContext) as Required<UserContextInterface>
}
