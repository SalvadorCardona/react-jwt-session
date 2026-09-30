import { getUserConfig, RefreshTokenResponse } from "@/UserConfig"

/**
 * How a refresh token reaches the API: the application's own function when it
 * gave one, a plain `fetch` on the configured URL otherwise — and nothing at
 * all when neither is set, the session then simply lasting as long as its JWT.
 */
export function getRefreshTokenRequest():
  ((refreshToken: string) => Promise<RefreshTokenResponse>) | undefined {
  const { refreshTokenRequest, refreshUrl } = getUserConfig()

  if (refreshTokenRequest) return refreshTokenRequest
  if (refreshUrl)
    return (refreshToken) => fetchRefreshToken(refreshUrl, refreshToken)

  return undefined
}

export function getRevokeRefreshToken():
  ((refreshToken: string) => Promise<void>) | undefined {
  const { revokeRefreshToken, logoutUrl } = getUserConfig()

  if (revokeRefreshToken) return revokeRefreshToken
  if (logoutUrl) {
    return async (refreshToken) => {
      await postRefreshToken(logoutUrl, refreshToken)
    }
  }

  return undefined
}

async function fetchRefreshToken(
  url: string,
  refreshToken: string
): Promise<RefreshTokenResponse> {
  const response = await postRefreshToken(url, refreshToken)

  if (response.ok) {
    const data = await response.json().catch(() => undefined)

    if (data?.token && data?.refreshToken) {
      return { token: data.token, refreshToken: data.refreshToken }
    }
  }

  return { status: response.status }
}

function postRefreshToken(url: string, refreshToken: string): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refreshToken }),
  })
}
