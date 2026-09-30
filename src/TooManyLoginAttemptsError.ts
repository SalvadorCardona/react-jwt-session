/**
 * The API suspended sign-ins to this account from this device after too many
 * failures (429). Carry the API's message: it says how long to wait.
 *
 * A wrong password and a temporarily locked account are not fixed the same way
 * — the second only asks to wait — hence a dedicated error for the login form.
 */
export class TooManyLoginAttemptsError extends Error {
  name = "TooManyLoginAttemptsError"
}
