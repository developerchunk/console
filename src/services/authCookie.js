const TOKEN_COOKIE_NAME = 'developerToken'

const isHttps = () => typeof window !== 'undefined' && window.location.protocol === 'https:'

export const getDeveloperTokenFromCookie = () => {
  if (typeof document === 'undefined') return null

  const cookieValue = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${TOKEN_COOKIE_NAME}=`))

  if (!cookieValue) return null
  return decodeURIComponent(cookieValue.split('=')[1] || '') || null
}

export const setDeveloperTokenCookie = (token) => {
  if (typeof document === 'undefined' || !token) return

  const maxAgeSeconds = 60 * 60 * 24 * 7
  const secureAttr = isHttps() ? '; Secure' : ''
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secureAttr}`
}

export const clearDeveloperTokenCookie = () => {
  if (typeof document === 'undefined') return

  const secureAttr = isHttps() ? '; Secure' : ''
  document.cookie = `${TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secureAttr}`
}
