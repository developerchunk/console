import { useEffect, useMemo, useState } from 'react'
import { createProfile, getProfile, updateProfile } from '../api'
import { mapApiErrorMessage } from '../services/ktwUtils'
import { useAuthStore } from '../store/authStore'

const PURPOSE_OPTIONS = [
  { value: 'personal_testing', label: 'Personal Testing' },
  { value: 'company_work', label: 'Company / Work' },
  { value: 'personal_production', label: 'Personal Production' }
]

const USER_BASE_OPTIONS = [
  { value: 'lt_100', label: 'Less than 100 users' },
  { value: 'lt_1k', label: 'Less than 1,000 users' },
  { value: 'lt_10k', label: 'Less than 10,000 users' },
  { value: 'lt_100k', label: 'Less than 100,000 users' },
  { value: 'lt_500k', label: 'Less than 500,000 users' },
  { value: '1m_plus', label: '1 million+ users' }
]

const EMPTY_FORM = {
  username: '',
  name: '',
  purpose: 'personal_testing',
  userBase: 'lt_100',
  city: '',
  country: ''
}

const PROFILE_COMPLETE_KEY = 'ketoy_profile_complete'
const PROFILE_STATUS_KEY = 'ketoy_profile_status'

const isUsernameValid = (value) => /^[a-z0-9-]{2,}$/.test(String(value || '').trim())

export default function ProfilePage() {
  const updateDeveloper = useAuthStore((state) => state.updateDeveloper)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(true)
  const [profile, setProfile] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [toast, setToast] = useState('')

  const namespacePreview = useMemo(() => {
    const username = String(formData.username || profile?.username || '').trim()
    if (!username) return 'dev.ketoy.<username>.*'
    return `dev.ketoy.${username}.*`
  }, [formData.username, profile?.username])

  const showToast = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }

  const markProfileComplete = (value) => {
    const status = value ? 'complete' : 'incomplete'
    localStorage.setItem(PROFILE_COMPLETE_KEY, value ? 'true' : 'false')
    localStorage.setItem(PROFILE_STATUS_KEY, status)
    window.dispatchEvent(new CustomEvent('ketoy-profile-complete-changed', { detail: { status } }))
  }

  const loadProfile = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getProfile()
      const payload = response?.data?.data || response?.data || {}
      const data = payload?.profile || payload?.developer || payload
      const hasUsername = Boolean(data?.username)
      const complete = typeof data?.complete === 'boolean'
        ? Boolean(data.complete && hasUsername)
        : hasUsername

      if (!complete) {
        setIsSetupMode(true)
        setProfile(data || null)
        setFormData((prev) => ({ ...prev, name: data?.name || '', city: data?.city || '', country: data?.country || '' }))
        if (data?.username) {
          updateDeveloper({ ...data, username: String(data.username).trim() })
        }
        markProfileComplete(false)
      } else {
        setIsSetupMode(false)
        setProfile(data)
        setFormData({
          username: data.username || '',
          name: data.name || '',
          purpose: data.purpose || 'personal_testing',
          userBase: data.userBase || 'lt_100',
          city: data.city || '',
          country: data.country || ''
        })
        updateDeveloper({ ...data, username: String(data.username).trim() })
        markProfileComplete(true)
      }
    } catch (err) {
      if (err?.response?.status === 404 || err?.response?.data?.error?.code === 'PROFILE_INCOMPLETE') {
        setIsSetupMode(true)
        setProfile(null)
        setFormData(EMPTY_FORM)
        markProfileComplete(false)
      } else {
        setError(mapApiErrorMessage(err, 'Failed to load profile'))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    if (name === 'username') {
      const normalized = value.toLowerCase().replace(/\s+/g, '')
      setFormData((prev) => ({ ...prev, username: normalized }))
      setUsernameError('')
      return
    }

    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreateProfile = async () => {
    setSaving(true)
    setError('')
    setUsernameError('')

    const payload = {
      username: String(formData.username || '').trim(),
      name: String(formData.name || '').trim(),
      purpose: formData.purpose,
      userBase: formData.userBase,
      city: String(formData.city || '').trim(),
      country: String(formData.country || '').trim()
    }

    if (!isUsernameValid(payload.username)) {
      setUsernameError('Username must be lowercase letters, numbers, or hyphens, min 2 characters')
      setSaving(false)
      return
    }

    try {
      const response = await createProfile(payload)
      const payloadData = response?.data?.data || response?.data || payload
      const data = payloadData?.profile || payloadData?.developer || payloadData
      setProfile(data)
      setFormData({
        username: data.username || payload.username,
        name: data.name || payload.name,
        purpose: data.purpose || payload.purpose,
        userBase: data.userBase || payload.userBase,
        city: data.city || payload.city,
        country: data.country || payload.country
      })
      updateDeveloper({ ...data, username: String(data.username || payload.username).trim() })
      setIsSetupMode(false)
      markProfileComplete(true)
      showToast('Profile created. Welcome to Ketoy.')
    } catch (err) {
      const code = err?.response?.data?.error?.code
      const message = String(
        err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || ''
      ).toLowerCase()

      if (code === 'CONFLICT' && message.includes('already have')) {
        await loadProfile()
      } else if (code === 'CONFLICT') {
        setUsernameError('This username is already taken')
      } else {
        setError(mapApiErrorMessage(err, 'Failed to create profile'))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSaveChanges = async () => {
    setSaving(true)
    setError('')

    try {
      const payload = {
        name: String(formData.name || '').trim(),
        purpose: formData.purpose,
        userBase: formData.userBase,
        city: String(formData.city || '').trim(),
        country: String(formData.country || '').trim()
      }

      const response = await updateProfile(payload)
      const payloadData = response?.data?.data || response?.data || payload
      const data = payloadData?.profile || payloadData?.developer || payloadData
      const nextProfile = {
        ...(profile || {}),
        ...data
      }
      setProfile(nextProfile)
      setFormData((prev) => ({ ...prev, ...payload }))
      if (nextProfile?.username) {
        updateDeveloper({ ...nextProfile, username: String(nextProfile.username).trim() })
      }
      markProfileComplete(true)
      showToast('Profile updated')
    } catch (err) {
      setError(mapApiErrorMessage(err, 'Failed to update profile'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-sm text-gray-400">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {toast && (
        <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {toast}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {isSetupMode ? (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h1 className="text-2xl font-semibold text-white">Complete your profile to get started</h1>
          <p className="mt-2 text-sm text-gray-400">Your username is permanent and cannot be changed.</p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="your-username"
                className="w-full bg-[#0f1c2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
              <p className="mt-1 text-xs text-gray-500">Permanent. Cannot be changed after creation.</p>
              {usernameError && <p className="mt-1 text-xs text-red-300">{usernameError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                maxLength={100}
                className="w-full bg-[#0f1c2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Purpose</label>
              <select
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                className="w-full bg-[#0f1c2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {PURPOSE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">User Base</label>
              <select
                name="userBase"
                value={formData.userBase}
                onChange={handleChange}
                className="w-full bg-[#0f1c2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {USER_BASE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">City (optional)</label>
                <input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full bg-[#0f1c2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Country (optional)</label>
                <input
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full bg-[#0f1c2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#0f1c2e] px-3 py-2 text-xs text-gray-400">
              Your free namespace: <span className="text-gray-200 font-mono">{namespacePreview}</span>
            </div>

            <button
              type="button"
              onClick={handleCreateProfile}
              disabled={saving}
              className="btn-ketoy btn-ketoy-primary"
            >
              {saving ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h1 className="text-2xl font-semibold text-white">Profile</h1>

          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-400">Username:</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-sm text-white font-mono">
                {profile?.username || formData.username}
              </span>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#0f1c2e] px-3 py-2 text-xs text-gray-400">
              Your free namespace: <span className="text-gray-200 font-mono">dev.ketoy.{profile?.username || formData.username}.*</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                value={profile?.email || ''}
                readOnly
                className="w-full bg-[#0b1424] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                maxLength={100}
                className="w-full bg-[#0f1c2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Purpose</label>
              <select
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                className="w-full bg-[#0f1c2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {PURPOSE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">User Base</label>
              <select
                name="userBase"
                value={formData.userBase}
                onChange={handleChange}
                className="w-full bg-[#0f1c2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {USER_BASE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                <input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full bg-[#0f1c2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Country</label>
                <input
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full bg-[#0f1c2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saving}
              className="btn-ketoy btn-ketoy-primary"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
