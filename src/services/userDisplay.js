const USERNAME_KEY = 'ketoy_username'
const TOKEN_KEY = 'developerToken'

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

const usernameFromEmail = (email) => {
  if (!email || typeof email !== 'string') return ''
  return email.split('@')[0]?.trim() || ''
}

const normalizeUsername = (value) => {
  if (!value || typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.includes('@')) return usernameFromEmail(trimmed)
  return trimmed
}

const normalizeProfileUsername = (value) => {
  if (!value || typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed || trimmed.includes('@')) return ''
  return trimmed
}

export const getDisplayUsername = (developer) => {
  const developerProfileUsername = normalizeProfileUsername(developer?.username)

  if (typeof window === 'undefined') {
    return (
      developerProfileUsername ||
      normalizeUsername(developer?.name) ||
      usernameFromEmail(developer?.email) ||
      'Developer'
    )
  }

  const storedUsername = normalizeProfileUsername(localStorage.getItem(USERNAME_KEY))
  if (storedUsername) return storedUsername

  if (developerProfileUsername) return developerProfileUsername

  const token = localStorage.getItem(TOKEN_KEY)
  const payload = decodeTokenPayload(token)
  const tokenUsername =
    normalizeProfileUsername(payload?.['cognito:username']) ||
    usernameFromEmail(payload?.email)

  if (tokenUsername) return tokenUsername

  return normalizeUsername(developer?.name) || usernameFromEmail(developer?.email) || 'Developer'
}