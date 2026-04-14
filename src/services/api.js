import axios from 'axios'
import { getIdToken, useAuthStore } from '../store/authStore'
import { API_ERROR_MESSAGES } from './ktwUtils'

const BASE = import.meta.env.DEV
  ? '/__api'
  : import.meta.env.VITE_API_BASE_URL || 'https://api.ketoy.dev'

const API_KEY_STORAGE = 'ketoy_api_key'

const normalizeApp = (app) => {
  if (!app || typeof app !== 'object') return app
  return {
    ...app,
    packageName: app.packageName || app.bundleId
  }
}

const normalizeScreen = (screen) => {
  if (!screen || typeof screen !== 'object') return screen
  return {
    ...screen,
    screenName: screen.screenName || screen.screenId,
    ktwSizeBytes: screen.ktwSizeBytes ?? null
  }
}

const normalizeResponse = (response) => {
  const payload = response?.data?.data
  if (!payload) return response

  const normalizeListItems = (items) => {
    const hasAppLike = items.some((item) => item && (item.bundleId || item.packageName || item.appName))
    const hasScreenLike = items.some((item) => item && (item.screenId || item.screenName))

    if (hasAppLike) return items.map(normalizeApp)
    if (hasScreenLike) return items.map(normalizeScreen)
    return items
  }

  if (Array.isArray(payload?.items)) {
    response.data.data = {
      ...payload,
      items: normalizeListItems(payload.items)
    }
    return response
  }

  if (Array.isArray(payload)) {
    response.data.data = {
      items: normalizeListItems(payload)
    }
    return response
  }

  if (payload.bundleId || payload.packageName || payload.appName) {
    response.data.data = normalizeApp(payload)
  }

  if (payload.screenId || payload.screenName) {
    response.data.data = normalizeScreen(response.data.data)
  }

  return response
}

const asKtwBinary = (data) => {
  if (data instanceof Blob || data instanceof ArrayBuffer) return data

  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  }

  return data
}

// Management + protected routes
const api = axios.create({
  baseURL: BASE,
  headers: {
    'Content-Type': 'application/json'
  }
})

const publicApi = axios.create({
  baseURL: BASE,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add Cognito ID token for protected APIs.
api.interceptors.request.use(
  (config) => {
    const storedApiKey = typeof window !== 'undefined'
      ? String(localStorage.getItem(API_KEY_STORAGE) || '').trim()
      : ''
    const idToken = getIdToken()

    if (config?.forceBearerAuth) {
      if (config.headers) {
        delete config.headers['X-Api-Key']
        delete config.headers['x-api-key']
      }
      if (idToken) {
        config.headers.Authorization = `Bearer ${idToken}`
      }
      return config
    }

    if (config?.useApiKeyAuth && storedApiKey) {
      if (config.headers) {
        delete config.headers.Authorization
      }
      config.headers['X-Api-Key'] = storedApiKey
    } else if (idToken) {
      config.headers.Authorization = `Bearer ${idToken}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    if (response?.config?.responseType === 'arraybuffer') {
      return response
    }

    // Known backend error codes surfaced via `ok: false` envelope:
    // INVALID_ID        - appId, screenId, or snapshotId contains
    //                     disallowed characters (must match [a-zA-Z0-9._-]{1,128})
    // INVALID_KTW       - body is not a valid .ktw file
    // INVALID_TYPE      - rollback type is not "json" or "ktw"
    // INVALID_SCREEN    - bundle entry missing required fields
    // BUNDLE_TOO_LARGE  - bundle exceeds 50-screen limit
    // PAYLOAD_TOO_LARGE - file exceeds 1 MB limit
    // MISSING_BODY      - binary upload received no body
    if (response?.data?.ok === false) {
      throw new Error(response.data?.error?.message || 'Request failed')
    }
    return normalizeResponse(response)
  },
  (error) => {
    const status = error.response?.status
    const errorCode = error.response?.data?.error?.code
    const responseMessage = error.response?.data?.error?.message || error.response?.data?.message
    const headers = error.config?.headers || {}
    const hasApiKeyHeader = Boolean(headers['X-Api-Key'] || headers['x-api-key'])

    if (status === 401 && !hasApiKeyHeader) {
      useAuthStore.getState().logout()
    }

    if (errorCode && API_ERROR_MESSAGES[errorCode]) {
      error.message = API_ERROR_MESSAGES[errorCode]
    } else if (status === 403) {
      error.message = API_ERROR_MESSAGES.FORBIDDEN
    } else if (responseMessage && !error.message) {
      error.message = responseMessage
    }

    return Promise.reject(error)
  }
)

// App APIs
export const appAPI = {
  register: (data) => {
    const payload = {
      bundleId: data.bundleId || data.packageName,
      appName: data.appName,
      contacts: Array.isArray(data.contacts) ? data.contacts : []
    }

    if (typeof data?.description === 'string' && data.description.trim()) {
      payload.description = data.description.trim()
    }

    if (data?.metadata && typeof data.metadata === 'object') {
      const metadata = Object.fromEntries(
        Object.entries(data.metadata).filter(([, value]) => value !== undefined && value !== null && value !== '')
      )
      if (Object.keys(metadata).length > 0) {
        payload.metadata = metadata
      }
    }

    return api.post('/apps', payload)
  },
  getAll: (params = {}) => api.get('/apps', { params }),


  getDetails: (bundleId) => api.get(`/apps/${encodeURIComponent(bundleId)}`),


  update: (bundleId, data) => {
    const payload = {}
    if (typeof data?.appName === 'string') payload.appName = data.appName
    if (Array.isArray(data?.contacts)) payload.contacts = data.contacts
    return api.put(`/apps/${encodeURIComponent(bundleId)}`, payload)
  },
  delete: (bundleId) => api.delete(`/apps/${encodeURIComponent(bundleId)}`),
  requestVerification: (appId) => api.post(`/apps/${encodeURIComponent(appId)}/verify`),
  checkVerification: (appId) => api.post(`/apps/${encodeURIComponent(appId)}/verify/check`)
}

// Screen APIs
export const screenAPI = {
  upload: (bundleId, screenId, data, version = '') => screenAPI.uploadKtw(bundleId, screenId, data, version),

  getAll: (bundleId, params = {}) => api.get(`/apps/${encodeURIComponent(bundleId)}/screens`, { params }),

  getDetails: (bundleId, screenId) => api.get(`/apps/${encodeURIComponent(bundleId)}/screens/${encodeURIComponent(screenId)}`),

  update: (bundleId, screenId, data, version = '') => screenAPI.uploadKtw(bundleId, screenId, data, version),

  delete: (bundleId, screenId) => api.delete(`/apps/${encodeURIComponent(bundleId)}/screens/${encodeURIComponent(screenId)}`),
  fetchPublic: (bundleId, screenId) => screenAPI.fetchPublicKtw(bundleId, screenId),

  uploadKtw: (bundleId, screenId, binaryData, version = '') => {
    const normalizedVersion = String(version || '').trim()
    const versionQuery = normalizedVersion ? `?version=${encodeURIComponent(normalizedVersion)}` : ''
    return api.post(`/apps/${encodeURIComponent(bundleId)}/screens/${encodeURIComponent(screenId)}/ktw${versionQuery}`, asKtwBinary(binaryData), {
      headers: { 'Content-Type': 'application/octet-stream' }
    })
  },

  fetchPublicKtw: (bundleId, screenId) =>
    publicApi.get('/ktw', {
      params: { app: bundleId, screen: screenId },
      responseType: 'arraybuffer'
    }),

  uploadBundle: (bundleId, screens, bundleVersion) => screenAPI.uploadBundleKtw(bundleId, screens, bundleVersion),

  uploadBundleKtw: (bundleId, screens, bundleVersion) => {
    return api.post(`/apps/${encodeURIComponent(bundleId)}/screens/bundle/ktw`, {
      bundleVersion,
      screens: screens.map((s) => ({ screenId: s.screenId, version: bundleVersion, ktw: s.ktw }))
    })
  },

  getVersions: (bundleId, screenId) => api.get(`/apps/${encodeURIComponent(bundleId)}/screens/${encodeURIComponent(screenId)}/versions`),

  getByVersion: (bundleId, screenId, version) =>
    api.get(`/apps/${encodeURIComponent(bundleId)}/screens/${encodeURIComponent(screenId)}/versions/${encodeURIComponent(version)}`, {
      responseType: 'arraybuffer'
    }),
  rollback: (bundleId, screenId, version, newVersion) => api.post(`/apps/${encodeURIComponent(bundleId)}/screens/${encodeURIComponent(screenId)}/rollback`, { version, newVersion })
}

export const bundleAPI = {
  getAll: (bundleId, params = {}) =>
    api.get(`/apps/${encodeURIComponent(bundleId)}/bundles`, { params }),

  getDetails: (bundleId, snapshotId) =>
    api.get(`/apps/${encodeURIComponent(bundleId)}/bundles/${encodeURIComponent(snapshotId)}`),
  
  promote: (bundleId, snapshotId, newBundleVersion, screenIds) => {
    return api.post(`/apps/${encodeURIComponent(bundleId)}/bundles/${encodeURIComponent(snapshotId)}/promote`, {
      newBundleVersion,
      screens: screenIds.map((screenId) => ({ screenId, newVersion: newBundleVersion }))
    })
  }
}

export const keyAPI = {
  create: (label) => api.post('/keys', { label }, { forceBearerAuth: true }),
  list: (apiKey) => api.get('/keys', {
    headers: apiKey ? { 'X-Api-Key': apiKey } : undefined
  }),
  revoke: (keyId, apiKey) => api.delete(`/keys/${encodeURIComponent(keyId)}`, {
    headers: apiKey ? { 'X-Api-Key': apiKey } : undefined
  })
}

export const createApiKey = (label) => keyAPI.create(label)
export const listApiKeys = () => api.get('/keys', { useApiKeyAuth: true })
export const revokeApiKey = (keyId) => api.delete(`/keys/${encodeURIComponent(keyId)}`, { useApiKeyAuth: true })

export const profileAPI = {
  getMyProfile: () => api.get('/profile'),
  setupProfile: (data) => api.post('/profile', data)
}

export default api
