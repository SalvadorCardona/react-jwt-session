export interface LoginReponseInterface {
  token: string
  /** Handed out next to the JWT by APIs that renew sessions. */
  refreshToken?: string
}
