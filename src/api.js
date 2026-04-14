import api, { createApiKey, listApiKeys, revokeApiKey } from './services/api'

export { createApiKey, listApiKeys, revokeApiKey }

export const createProfile = (data) => api.post('/profile', data)
export const updateProfile = (data) => api.put('/profile', data)
export const getProfile = () => api.get('/profile')
export const getPublicProfile = (username) => api.get(`/profile/${encodeURIComponent(username)}`)

export default api
