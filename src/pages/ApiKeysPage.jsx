import { useEffect, useMemo, useState } from 'react'
import { createApiKey, listApiKeys, revokeApiKey } from '../api'

const formatDate = (value) => {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Never'
  return date.toLocaleString()
}

const maskKeyId = (value) => {
  const text = String(value || '').trim()
  if (!text) return '-'
  return text.length <= 8 ? text : `${text.slice(0, 8)}...`
}

export default function ApiKeysPage() {
  const [label, setLabel] = useState('')
  const [labelError, setLabelError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState('')
  const [keys, setKeys] = useState([])
  const [newKey, setNewKey] = useState('')

  const normalizedLabel = useMemo(() => String(label || '').trim(), [label])

  const loadKeys = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await listApiKeys()
      const payload = response?.data?.data || response?.data || {}
      const items = Array.isArray(payload) ? payload : Array.isArray(payload.items) ? payload.items : []
      setKeys(items)
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load API keys')
      setKeys([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  const handleCreate = async () => {
    setLabelError('')
    setError('')

    if (!normalizedLabel || normalizedLabel.length > 64) {
      setLabelError('API key label must be between 1 and 64 characters')
      return
    }

    setCreating(true)

    try {
      const response = await createApiKey(normalizedLabel)
      const payload = response?.data?.data || response?.data || {}
      const keyValue = payload.key || ''

      setNewKey(keyValue)
      if (keyValue) {
        localStorage.setItem('ketoy_api_key', keyValue)
      }
      setLabel('')
      await loadKeys()
    } catch (err) {
      const code = err?.response?.data?.error?.code
      if (code === 'INVALID_LABEL') {
        setLabelError('API key label must be between 1 and 64 characters')
      } else {
        setError(err?.response?.data?.error?.message || err?.message || 'Failed to create API key')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleCopyNewKey = async () => {
    if (!newKey) return
    await navigator.clipboard.writeText(newKey)
    setNewKey('')
  }

  const handleRevoke = async (key) => {
    const keyId = key?.keyId || key?.id || key?._id
    const keyLabel = key?.label || keyId
    if (!keyId) return

    const confirmed = window.confirm(`Revoke key '${keyLabel}'? This cannot be undone.`)
    if (!confirmed) return

    setRevokingId(keyId)
    setError('')

    try {
      await revokeApiKey(keyId)
      setKeys((prev) => prev.filter((item) => (item.keyId || item.id || item._id) !== keyId))
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to revoke API key')
    } finally {
      setRevokingId('')
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white">API Keys</h1>
        <p className="mt-2 text-sm text-gray-400">Use API keys for CLI, scripts, and CI/CD. Keys never expire until revoked.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-white text-base font-semibold">Create Key</h2>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            type="text"
            value={label}
            onChange={(event) => {
              setLabel(event.target.value)
              if (labelError) setLabelError('')
            }}
            maxLength={64}
            placeholder="e.g. macbook-local, github-actions"
            className="w-full sm:w-[28rem] bg-[#0f1c2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="btn-ketoy btn-ketoy-primary"
          >
            {creating ? 'Creating...' : 'Create Key'}
          </button>
        </div>
        {labelError && <p className="mt-2 text-xs text-red-300">{labelError}</p>}

        {newKey && (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="font-semibold text-amber-100">This key will not be shown again. Copy it now.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 text-sm text-emerald-300 break-all">{newKey}</code>
              <button
                type="button"
                onClick={handleCopyNewKey}
                className="btn-ketoy btn-ketoy-secondary !px-2.5 !py-1.5 !text-xs"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => setNewKey('')}
                className="btn-ketoy btn-ketoy-secondary !px-2.5 !py-1.5 !text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-white text-base font-semibold mb-3">Keys</h2>

        {loading ? (
          <p className="text-sm text-gray-400">Loading keys...</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-gray-500">No API keys yet. Create one above.</p>
        ) : (
          <div className="overflow-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-[#0f1c2e] text-gray-300">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Label</th>
                  <th className="text-left px-3 py-2 font-medium">Key ID</th>
                  <th className="text-left px-3 py-2 font-medium">Created</th>
                  <th className="text-left px-3 py-2 font-medium">Last Used</th>
                  <th className="text-right px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-[#111a2a]">
                {keys.map((key) => {
                  const id = key.keyId || key.id || key._id || ''

                  return (
                    <tr key={id || `${key.label}-${key.createdAt}`}>
                      <td className="px-3 py-2 text-gray-200">{key.label || '-'}</td>
                      <td className="px-3 py-2 text-gray-200 font-mono">{maskKeyId(id)}</td>
                      <td className="px-3 py-2 text-gray-300">{formatDate(key.createdAt)}</td>
                      <td className="px-3 py-2 text-gray-300">{formatDate(key.lastUsedAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRevoke(key)}
                          disabled={revokingId === id}
                          className="btn-ketoy btn-ketoy-danger !px-2.5 !py-1.5 !text-xs"
                        >
                          {revokingId === id ? 'Revoking...' : 'Revoke'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
