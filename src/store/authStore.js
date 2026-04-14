import { create } from 'zustand'
import {
  clearDeveloperTokenCookie,
  getDeveloperTokenFromCookie,
  setDeveloperTokenCookie
} from '../services/authCookie'

const TOKEN_KEY = 'developerToken'
const DEVELOPER_KEY = 'developer'
const USERNAME_KEY = 'ketoy_username'
const PROFILE_DISPLAY_NAME_KEY = 'ketoy_profile_display_name'
const API_KEY_STORAGE = 'ketoy_api_key'
const API_KEY_LEGACY_STORAGE = 'ketoy_console_api_key'

export const getIdToken = () => getDeveloperTokenFromCookie() || localStorage.getItem(TOKEN_KEY)

const parseStoredDeveloper = () => {
  const storedDeveloper = localStorage.getItem(DEVELOPER_KEY)
  if (!storedDeveloper) return null

  try {
    return JSON.parse(storedDeveloper)
  } catch {
    return null
  }
}

const clearAuthStorage = () => {
  clearDeveloperTokenCookie()
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(DEVELOPER_KEY)
  localStorage.removeItem(USERNAME_KEY)
  localStorage.removeItem(PROFILE_DISPLAY_NAME_KEY)
  localStorage.removeItem(API_KEY_STORAGE)
  localStorage.removeItem(API_KEY_LEGACY_STORAGE)
}

export const useAuthStore = create((set) => {
  const storedToken = getIdToken()
  const storedDeveloper = parseStoredDeveloper()
  
  return {
    developer: storedDeveloper,
    developerToken: storedToken,
    isAuthenticated: Boolean(storedToken),
    getIdToken,
    
    setAuth: (developer, token, username) => {
      setDeveloperTokenCookie(token)
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(DEVELOPER_KEY, JSON.stringify(developer))
      if (username) {
        localStorage.setItem(USERNAME_KEY, username)
      }
      const displayName = String(developer?.displayName || developer?.name || '').trim()
      if (displayName) {
        localStorage.setItem(PROFILE_DISPLAY_NAME_KEY, displayName)
      } else {
        localStorage.removeItem(PROFILE_DISPLAY_NAME_KEY)
      }
      set({ developer, developerToken: token, isAuthenticated: true })
    },
    
    updateDeveloper: (developer) => {
      localStorage.setItem(DEVELOPER_KEY, JSON.stringify(developer))
      if (developer?.username) {
        localStorage.setItem(USERNAME_KEY, developer.username)
      }
      const displayName = String(developer?.displayName || developer?.name || '').trim()
      if (displayName) {
        localStorage.setItem(PROFILE_DISPLAY_NAME_KEY, displayName)
      } else {
        localStorage.removeItem(PROFILE_DISPLAY_NAME_KEY)
      }
      set({ developer })
    },
    
    logout: () => {
      clearAuthStorage()
      set({ developer: null, developerToken: null, isAuthenticated: false })
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
  }
})
