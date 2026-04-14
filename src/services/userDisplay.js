const TOKEN_KEY = 'developerToken'
const PROFILE_DISPLAY_NAME_KEY = 'ketoy_profile_display_name'

const decodeTokenPayload = (token) => {
  if (!token || typeof token !== 'string') return null

  try {
    const [, payload] = token.split('.')
    if (!payload) return null

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

const normalizeText = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export const getDisplayUsername = (developer) => {
  const fromDeveloperDisplayName = normalizeText(developer?.displayName)
  const fromDeveloperName = normalizeText(developer?.name)
  const fromDeveloperEmail = normalizeText(developer?.email)

  if (typeof window === 'undefined') {
    return fromDeveloperDisplayName || fromDeveloperName || fromDeveloperEmail || 'Developer'
  }

  const storedDisplayName = normalizeText(localStorage.getItem(PROFILE_DISPLAY_NAME_KEY))
  if (storedDisplayName) return storedDisplayName

  const token = localStorage.getItem(TOKEN_KEY)
  const payload = decodeTokenPayload(token)
  const claimEmail = normalizeText(payload?.email || payload?.['cognito:username'])

  return fromDeveloperDisplayName || fromDeveloperName || fromDeveloperEmail || claimEmail || 'Developer'
}