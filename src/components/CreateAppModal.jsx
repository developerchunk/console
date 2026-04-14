import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { appAPI } from '../services/api'
import { isFreeTierApp } from '../services/ktwUtils'
import { profileAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { keyAPI } from '../services/api'

const DOMAIN_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/
const SEGMENT_PATTERN = /^[a-z][a-z0-9_]{2,31}$/

export default function CreateAppModal({ isOpen, onClose, onSuccess }) {
  const { addApp } = useAppStore()
  const { developer } = useAuthStore((state) => ({ developer: state.developer }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copyMessage, setCopyMessage] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [appInternalKey, setAppInternalKey] = useState(null)
  const [developerApiKey, setDeveloperApiKey] = useState('')
  const [developerApiKeyId, setDeveloperApiKeyId] = useState('')
  const [creatingDeveloperKey, setCreatingDeveloperKey] = useState(false)
  const [developerKeyError, setDeveloperKeyError] = useState('')
  const [profileUsername, setProfileUsername] = useState('')
  const [domainMode, setDomainMode] = useState('default')
  const [formData, setFormData] = useState({
    packageSegment: '',
    customDomain: '',
    appName: '',
    description: ''
  })

  useEffect(() => {
    if (!isOpen) return

    let mounted = true
    const loadProfile = async () => {
      try {
        const response = await profileAPI.getMyProfile()
        const profile = response.data?.data || response.data || {}
        if (mounted && profile?.username) {
          setProfileUsername(String(profile.username).trim())
        }
      } catch {
        if (mounted && developer?.username) {
          setProfileUsername(String(developer.username).trim())
        }
      }
    }

    if (developer?.username) {
      setProfileUsername(String(developer.username).trim())
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [isOpen, developer?.username])

  const normalizedSegment = String(formData.packageSegment || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')

  const defaultDomain = useMemo(() => {
    if (!profileUsername || !normalizedSegment) return ''
    return `dev.ketoy.${profileUsername}.${normalizedSegment}`
  }, [profileUsername, normalizedSegment])

  const activeDomain = domainMode === 'custom'
    ? String(formData.customDomain || '').trim().toLowerCase()
    : defaultDomain

  const showFreeTierHint = activeDomain.length > 0 && isFreeTierApp(activeDomain)
  const showCustomTierHint = activeDomain.length > 0 && !isFreeTierApp(activeDomain)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!profileUsername) {
        throw new Error('Username not found. Please complete profile setup first.')
      }

      if (domainMode === 'default' && !SEGMENT_PATTERN.test(normalizedSegment)) {
        throw new Error('Package name segment must be 3-32 chars: lowercase letters, numbers, underscore.')
      }

      if (domainMode === 'custom' && !DOMAIN_PATTERN.test(activeDomain)) {
        throw new Error('Custom domain format is invalid (example: com.example.myapp).')
      }

      const response = await appAPI.register({
        ...formData,
        packageName: activeDomain,
        metadata: {
          platform: 'android'
        }
      })

      const payload = response.data?.data || response.data || {}
      const newApp = payload.app || payload
      const newInternalKey = newApp?.apiKey || payload?.apiKey || ''

      if (!newApp || (!newApp.packageName && !newApp.bundleId && !newApp.appName)) {
        throw new Error('App created, but response shape is invalid. Please refresh projects.')
      }

      addApp(newApp)
      setAppInternalKey(newInternalKey)
      setShowApiKey(true)
      
      // Don't close immediately, show API key first
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create app'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (showApiKey && onSuccess) {
      onSuccess()
    }
    setCopyMessage('')
    setDomainMode('default')
    setDeveloperKeyError('')
    onClose()
  }

  const handleCreateDeveloperKey = async () => {
    setCreatingDeveloperKey(true)
    setDeveloperKeyError('')
    try {
      const response = await keyAPI.create(`console-ui-${Date.now()}`)
      const data = response.data?.data || response.data || {}
      setDeveloperApiKey(data.key || '')
      setDeveloperApiKeyId(data.keyId || '')
    } catch (err) {
      setDeveloperKeyError(err?.response?.data?.error?.message || err?.message || 'Failed to generate Developer API key')
    } finally {
      setCreatingDeveloperKey(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1a2332] rounded-lg max-w-md w-full p-6 border border-gray-800">
        {!showApiKey ? (
          <>
            <h2 className="text-2xl font-bold text-white mb-4">Create New Project</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Domain Configuration *
                </label>
                <div className="mb-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDomainMode('default')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border ${domainMode === 'default' ? 'bg-blue-500/20 border-blue-400/50 text-blue-200' : 'bg-transparent border-white/15 text-gray-300'}`}
                  >
                    Default Domain
                  </button>
                  <button
                    type="button"
                    onClick={() => setDomainMode('custom')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border ${domainMode === 'custom' ? 'bg-amber-500/20 border-amber-400/50 text-amber-200' : 'bg-transparent border-white/15 text-gray-300'}`}
                  >
                    Use Custom Domain
                  </button>
                </div>

                {domainMode === 'default' ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="packageSegment"
                      value={formData.packageSegment}
                      onChange={(event) => {
                        const value = event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                        setFormData((prev) => ({ ...prev, packageSegment: value }))
                      }}
                      placeholder="package_name"
                      required
                      className="w-full px-4 py-2 bg-[#0f1c2e] border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white select-text"
                    />
                    <input
                      type="text"
                      value={defaultDomain}
                      readOnly
                      placeholder="dev.ketoy.<username>.<package_name>"
                      className="w-full px-4 py-2 bg-[#0b1424] border border-gray-700 rounded-lg text-gray-300 select-text"
                    />
                    <p className="text-xs text-gray-400">Default domain is auto-generated and read-only.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="customDomain"
                      value={formData.customDomain}
                      onChange={handleChange}
                      placeholder="com.example.myapp"
                      required
                      pattern="^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$"
                      title="Custom domain must follow reverse-domain format (e.g., com.example.myapp)."
                      className="w-full px-4 py-2 bg-[#0f1c2e] border border-gray-700 rounded-lg focus:outline-none focus:border-amber-500 text-white select-text"
                    />
                    <p className="text-xs text-amber-200">Custom domain mode is active.</p>
                  </div>
                )}

                <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
                  <p className="font-medium mb-1">Domain Rules:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                    <li>Default mode uses <span className="text-emerald-400">dev.ketoy.{profileUsername || 'username'}.&lt;package_name&gt;</span></li>
                    <li>Only one mode is active at a time (default or custom)</li>
                    <li>Custom mode accepts full reverse-domain input</li>
                  </ul>
                </div>
                {showFreeTierHint && (
                  <p className="mt-2 text-xs text-blue-300">
                    Free tier app - ready to use immediately. No domain verification needed.
                  </p>
                )}
                {showCustomTierHint && (
                  <p className="mt-2 text-xs text-gray-400">
                    Custom bundle ID - you can optionally verify domain ownership after creation to lock this namespace.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  App Name *
                </label>
                <input
                  type="text"
                  name="appName"
                  value={formData.appName}
                  onChange={handleChange}
                  placeholder="My App"
                  required
                  className="w-full px-4 py-2 bg-[#0f1c2e] border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white select-text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description of your app"
                  rows={3}
                  className="w-full px-4 py-2 bg-[#0f1c2e] border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white resize-none select-text"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-[#0f1c2e] hover:bg-[#152235] text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white mb-4">App Created Successfully!</h2>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Your app has been created. Save the API keys below for API usage.
              </p>

              <div className="bg-[#0f1c2e] border border-gray-700 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  App Resource API Key
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-emerald-400 text-sm break-all font-mono">
                    {appInternalKey}
                  </code>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(appInternalKey || '')
                      setCopyMessage('App resource API key copied to clipboard.')
                      window.setTimeout(() => setCopyMessage(''), 1800)
                    }}
                    className="p-2 bg-[#1a2332] hover:bg-[#152235] rounded-lg text-gray-400 hover:text-white transition-colors"
                    title="Copy to clipboard"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  This key is returned by POST /apps.
                </p>
              </div>

              <div className="bg-[#0f1c2e] border border-gray-700 rounded-lg p-4 mt-3">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Developer API Key (ket_live_...)
                </label>

                {!developerApiKey ? (
                  <div>
                    <button
                      type="button"
                      onClick={handleCreateDeveloperKey}
                      disabled={creatingDeveloperKey}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm disabled:opacity-60"
                    >
                      {creatingDeveloperKey ? 'Generating...' : 'Generate Developer API Key'}
                    </button>
                    <p className="mt-2 text-xs text-gray-500">
                      Uses POST /keys. This key is shown once and should be stored securely.
                    </p>
                    {developerKeyError && (
                      <p className="mt-2 text-xs text-red-300">{developerKeyError}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-emerald-300 text-sm break-all font-mono">
                        {developerApiKey}
                      </code>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(developerApiKey)
                          setCopyMessage('Developer API key copied to clipboard.')
                          window.setTimeout(() => setCopyMessage(''), 1800)
                        }}
                        className="p-2 bg-[#1a2332] hover:bg-[#152235] rounded-lg text-gray-400 hover:text-white transition-colors"
                        title="Copy Developer API key"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    {developerApiKeyId && (
                      <p className="mt-2 text-xs text-gray-500 font-mono">keyId: {developerApiKeyId}</p>
                    )}
                  </div>
                )}
              </div>

              {copyMessage && (
                <p className="mt-3 text-xs text-emerald-300">{copyMessage}</p>
              )}
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  )
}
