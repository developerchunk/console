import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { profileAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'

const USERNAME_REGEX = /^[a-z0-9-]{3,20}$/

export default function ProfileSetupPage() {
  const navigate = useNavigate()
  const { developer, updateDeveloper } = useAuthStore((state) => ({
    developer: state.developer,
    updateDeveloper: state.updateDeveloper
  }))
  const [checking, setChecking] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ username: '', displayName: '' })
  const [namespace, setNamespace] = useState('')

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const response = await profileAPI.getMyProfile()
        const data = response.data?.data || response.data || {}

        if (data.username) {
          updateDeveloper({ ...(developer || {}), ...data })
          navigate('/apps', { replace: true })
          return
        }
      } catch (err) {
        if (err?.response?.status !== 404) {
          setError(err?.response?.data?.error?.message || err?.message || 'Failed to load profile status')
        }
      } finally {
        setChecking(false)
      }
    }

    checkProfile()
  }, [developer, navigate, updateDeveloper])

  const usernameError = useMemo(() => {
    if (!formData.username) return ''
    if (!USERNAME_REGEX.test(formData.username)) {
      return 'Username must be 3-20 chars: lowercase letters, numbers, hyphens.'
    }
    return ''
  }, [formData.username])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const username = String(formData.username || '').trim()
    const displayName = String(formData.displayName || '').trim()

    if (!USERNAME_REGEX.test(username)) {
      setError('Username must be 3-20 chars: lowercase letters, numbers, hyphens.')
      return
    }

    setSubmitting(true)
    try {
      const response = await profileAPI.setupProfile({ username, displayName })
      const data = response.data?.data || response.data || {}
      const profileNamespace = data.namespace || `dev.ketoy.${username}`

      updateDeveloper({ ...(developer || {}), username: data.username || username, displayName, namespace: profileNamespace })
      setNamespace(profileNamespace)

      window.setTimeout(() => {
        navigate('/apps', { replace: true })
      }, 1100)
    } catch (err) {
      const status = err?.response?.status
      const code = err?.response?.data?.error?.code
      const message = err?.response?.data?.error?.message || err?.message || 'Failed to save profile'

      if (status === 409 || code === 'CONFLICT') {
        setError('Username already taken or you already have a username.')
      } else {
        setError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#070b12] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-gray-400 text-sm">Checking profile setup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111b2b] p-6">
        <h1 className="text-2xl font-semibold">Set up your profile</h1>
        <p className="mt-2 text-sm text-gray-400">Choose your public username to unlock your free namespace.</p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {namespace && (
          <div className="mt-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-200">
            Your free namespace is dev.ketoy.{formData.username}.* - all apps under this prefix are auto-verified.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(event) => {
                const value = event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                setFormData((prev) => ({ ...prev, username: value }))
              }}
              placeholder="your-name"
              className="w-full px-4 py-2 bg-[#0f1c2e] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            />
            {usernameError && <p className="mt-1 text-xs text-amber-300">{usernameError}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Display Name</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(event) => setFormData((prev) => ({ ...prev, displayName: event.target.value }))}
              placeholder="Your name"
              className="w-full px-4 py-2 bg-[#0f1c2e] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || Boolean(usernameError)}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}