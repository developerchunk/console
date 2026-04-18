import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { appAPI } from '../services/api'
import { isFreeTierApp } from '../services/ktwUtils'
import { profileAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { keyAPI } from '../services/api'
import { getDisplayUsername } from '../services/userDisplay'

const DOMAIN_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/
const SEGMENT_PATTERN = /^[a-z][a-z0-9_]{2,31}$/

function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        padding: '5px 10px',
        borderRadius: 7,
        border: '1px solid rgba(255,255,255,0.15)',
        background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
        color: copied ? '#86efac' : '#d1d5db',
        fontSize: 11.5,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}

export default function CreateAppModal({ isOpen, onClose, onSuccess }) {
  const { addApp } = useAppStore()
  const { developer } = useAuthStore((state) => ({ developer: state.developer }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [appInternalKey, setAppInternalKey] = useState(null)
  const [showApiKey, setShowApiKey] = useState(false)
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
        const payload = response?.data?.data || response?.data || {}
        const profile = payload?.profile || payload?.developer || payload
        if (mounted && profile?.username) setProfileUsername(String(profile.username).trim())
      } catch {
        const fallbackName = getDisplayUsername(developer)
        if (mounted && fallbackName) setProfileUsername(String(fallbackName).trim())
      }
    }
    const fallbackName = getDisplayUsername(developer)
    if (fallbackName) setProfileUsername(String(fallbackName).trim())
    loadProfile()
    return () => { mounted = false }
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

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (!profileUsername) throw new Error('Username not found. Complete profile setup first.')
      if (domainMode === 'default' && !SEGMENT_PATTERN.test(normalizedSegment))
        throw new Error('Package segment must be 3-32 chars: lowercase letters, numbers, underscore.')
      if (domainMode === 'custom' && !DOMAIN_PATTERN.test(activeDomain))
        throw new Error('Custom domain format invalid (example: com.example.myapp).')

      const response = await appAPI.register({ ...formData, packageName: activeDomain, metadata: { platform: 'android' } })
      const payload = response.data?.data || response.data || {}
      const newApp = payload.app || payload
      const newInternalKey = newApp?.apiKey || payload?.apiKey || ''

      if (!newApp || (!newApp.packageName && !newApp.bundleId && !newApp.appName))
        throw new Error('App created, but response shape is invalid. Please refresh projects.')

      addApp(newApp)
      setAppInternalKey(newInternalKey)
      setShowApiKey(true)
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Failed to create app')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (showApiKey && onSuccess) onSuccess()
    setDomainMode('default')
    setDeveloperKeyError('')
    setShowApiKey(false)
    setFormData({ packageSegment: '', customDomain: '', appName: '', description: '' })
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
      setDeveloperKeyError(err?.response?.data?.error?.message || err?.message || 'Failed to generate key')
    } finally {
      setCreatingDeveloperKey(false)
    }
  }

  if (!isOpen) return null

  const inputStyle = {
    width: '100%',
    padding: '9px 13px',
    background: 'rgba(15,28,46,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 9,
    color: '#f1f5f9',
    fontSize: 13.5,
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#0f1a2a', borderRadius: 18, width: '100%', maxWidth: 480, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        {/* Modal header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
                {showApiKey ? 'Project Created' : 'New Project'}
              </h2>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.38)', marginTop: 3 }}>
                {showApiKey ? 'Save your API keys before continuing.' : 'Configure your new SDUI project.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, transition: 'all 0.15s' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div style={{ padding: '20px 24px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
          {!showApiKey ? (
            <>
              {error && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 9, color: '#fca5a5', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Domain mode */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Domain Mode
                  </label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {[
                      { key: 'default', label: 'Default', desc: `dev.ketoy.${profileUsername || 'username'}.*` },
                      { key: 'custom', label: 'Custom', desc: 'com.example.myapp' },
                    ].map(({ key, label, desc }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDomainMode(key)}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 10,
                          border: domainMode === key
                            ? (key === 'default' ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(245,158,11,0.5)')
                            : '1px solid rgba(255,255,255,0.1)',
                          background: domainMode === key
                            ? (key === 'default' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.08)')
                            : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                      >
                        <p style={{ fontSize: 13, fontWeight: 600, color: domainMode === key ? (key === 'default' ? '#93c5fd' : '#fcd34d') : 'rgba(255,255,255,0.6)', marginBottom: 2 }}>
                          {label}
                        </p>
                        <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)' }}>{desc}</p>
                      </button>
                    ))}
                  </div>

                  {domainMode === 'default' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        type="text"
                        name="packageSegment"
                        value={formData.packageSegment}
                        onChange={(e) => setFormData((prev) => ({ ...prev, packageSegment: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                        placeholder="package_name"
                        required
                        style={inputStyle}
                      />
                      {defaultDomain && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 8 }}>
                          <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#93c5fd', flex: 1, wordBreak: 'break-all' }}>{defaultDomain}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      name="customDomain"
                      value={formData.customDomain}
                      onChange={handleChange}
                      placeholder="com.example.myapp"
                      required
                      pattern="^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$"
                      style={inputStyle}
                    />
                  )}

                  {showFreeTierHint && (
                    <p style={{ marginTop: 6, fontSize: 12, color: '#93c5fd' }}>
                      Free tier — ready to use immediately, no verification required.
                    </p>
                  )}
                  {showCustomTierHint && (
                    <p style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>
                      Custom domain — you can verify ownership after creation to lock this namespace.
                    </p>
                  )}
                </div>

                {/* App name */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    App Name *
                  </label>
                  <input
                    type="text"
                    name="appName"
                    value={formData.appName}
                    onChange={handleChange}
                    placeholder="My App"
                    required
                    style={inputStyle}
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Brief description of your app"
                    rows={2}
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#d1d5db', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid rgba(34,197,94,0.4)', background: loading ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.15)', color: '#86efac', fontSize: 13.5, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.15s' }}
                  >
                    {loading ? 'Creating…' : 'Create Project'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="18" height="18" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p style={{ fontSize: 13.5, color: '#86efac', fontWeight: 600 }}>Project created successfully</p>
              </div>

              {/* App resource key */}
              <div style={{ padding: '14px 16px', borderRadius: 11, background: 'rgba(15,28,46,0.8)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <p style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  App Resource API Key
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 12.5, color: '#86efac', wordBreak: 'break-all' }}>
                    {appInternalKey}
                  </code>
                  <CopyButton value={appInternalKey} />
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>
                  Returned by POST /apps — store it securely.
                </p>
              </div>

              {/* Developer key */}
              <div style={{ padding: '14px 16px', borderRadius: 11, background: 'rgba(15,28,46,0.8)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <p style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Developer API Key
                </p>
                {!developerApiKey ? (
                  <div>
                    <button
                      type="button"
                      onClick={handleCreateDeveloperKey}
                      disabled={creatingDeveloperKey}
                      className="btn-ketoy btn-ketoy-primary"
                    >
                      {creatingDeveloperKey ? 'Generating…' : 'Generate Developer Key'}
                    </button>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 8 }}>
                      Uses POST /keys — shown once, store securely.
                    </p>
                    {developerKeyError && (
                      <p style={{ marginTop: 8, fontSize: 12, color: '#fca5a5' }}>{developerKeyError}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 12.5, color: '#86efac', wordBreak: 'break-all' }}>
                        {developerApiKey}
                      </code>
                      <CopyButton value={developerApiKey} />
                    </div>
                    {developerApiKeyId && (
                      <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>
                        keyId: {developerApiKeyId}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleClose}
                style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1px solid rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.12)', color: '#93c5fd', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
