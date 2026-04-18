import { useEffect, useMemo, useState } from 'react'
import { keyAPI } from '../services/api'

const parseKeys = (response) => {
  const payload = response?.data?.data || response?.data || {}
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.items)) return payload.items
  return []
}

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

export default function APIKeysManagementPage() {
  const [label, setLabel] = useState('macbook-local')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ketoy_console_api_key') || '')
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState('')
  const [error, setError] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [newKeyId, setNewKeyId] = useState('')
  const [copyMessage, setCopyMessage] = useState('')

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.ketoy.dev'

  const snippets = useMemo(() => {
    return {
      create: `KEY_RESP=$(curl -s -X POST "${apiBase}/keys" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"label":"${label || 'macbook-local'}"}')
echo "$KEY_RESP"
# Expected: keyId, key (ket_live_...), label, createdAt
# NOTE: key is shown ONCE — copy it now

export API_KEY=$(echo "$KEY_RESP" | grep -o '"key":"[^"]*"' | cut -d'"' -f4)
echo "API_KEY=\${API_KEY:0:20}..."`,
        list: `curl -s "${apiBase}/keys" \\
    -H "X-Api-Key: $API_KEY" | cat
  # Expected: items with keyId, label, createdAt, lastUsedAt`,
        revoke: `KEY_ID="<keyId from list>"
  curl -s -X DELETE "${apiBase}/keys/$KEY_ID" \\
    -H "X-Api-Key: $API_KEY" | cat
  # Expected: { revoked: true, keyId }`,
        multiple: `# Create a separate key for CI/CD
  curl -s -X POST "${apiBase}/keys" \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer $TOKEN" \\
    -d '{"label":"github-actions"}' | cat

  # If github gets compromised — revoke only that key, others still work`,
        errors: `# Invalid label
  curl -s -X POST "${apiBase}/keys" \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer $TOKEN" \\
    -d '{"label":""}' | cat
  # Expected: 400 INVALID_LABEL

  # Revoke non-existent key
  curl -s -X DELETE "${apiBase}/keys/bad-id" \\
    -H "X-Api-Key: $API_KEY" | cat
  # Expected: 404 NOT_FOUND

  # Revoke someone else's key
  curl -s -X DELETE "${apiBase}/keys/$KEY_ID" \\
    -H "X-Api-Key: $API_KEY_B" | cat
  # Expected: 403 FORBIDDEN`
    }
  }, [apiBase, label])

  const showCopied = (message) => {
    setCopyMessage(message)
    window.setTimeout(() => setCopyMessage(''), 1800)
  }

  const copyText = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text)
      showCopied(message)
    } catch {
      showCopied('Copy failed')
    }
  }

  const loadKeys = async () => {
    const normalizedApiKey = String(apiKey || '').trim()
    if (!normalizedApiKey) {
      setKeys([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await keyAPI.list(normalizedApiKey)
      setKeys(parseKeys(response))
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load keys')
      setKeys([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    localStorage.setItem('ketoy_console_api_key', apiKey)
  }, [apiKey])

  const handleCreate = async () => {
    const normalized = String(label || '').trim()
    if (!normalized) {
      setError('Label cannot be empty')
      return
    }

    setCreating(true)
    setError('')
    setNewKeyValue('')
    setNewKeyId('')

    try {
      const response = await keyAPI.create(normalized)
      const data = response?.data?.data || response?.data || {}
      setNewKeyValue(data.key || '')
      setNewKeyId(data.keyId || '')
      if (data.key) {
        setApiKey(data.key)
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (keyId) => {
    if (!keyId) return
    setRevokingId(keyId)
    setError('')
    try {
      await keyAPI.revoke(keyId, String(apiKey || '').trim())
      await loadKeys()
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to revoke key')
    } finally {
      setRevokingId('')
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.16em] text-gray-400 mb-2">Projects</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white">API Key Management</h1>
        <p className="text-sm text-gray-400 mt-2">Create, list, and revoke user API keys for CLI, scripts, and CI/CD.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-white text-base font-semibold">Use API Key for key management</h2>
        <p className="text-xs text-gray-400 mt-1">Paste your Developer API key (`ket_live_...`) to list and revoke keys.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="ket_live_..."
            className="w-full sm:w-[30rem] bg-[#0f1c2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={loadKeys}
            className="btn-ketoy btn-ketoy-secondary"
          >
            Load Keys
          </button>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-white text-base font-semibold">One-time setup (JWT): Create key</h2>
        <p className="text-xs text-gray-400 mt-1">After key creation, use X-Api-Key for all future key operations.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="macbook-local"
            className="w-64 bg-[#0f1c2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="btn-ketoy btn-ketoy-primary"
          >
            {creating ? 'Creating...' : 'Create API Key'}
          </button>
          <button
            type="button"
            onClick={() => copyText(snippets.create, 'Create snippet copied')}
            className="btn-ketoy btn-ketoy-secondary"
          >
            Copy 5a Curl
          </button>
        </div>

        {newKeyValue && (
          <div className="mt-4 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3">
            <p className="text-xs text-amber-100 mb-2">Shown once. Copy now.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-emerald-300 break-all">{newKeyValue}</code>
              <button
                type="button"
                onClick={() => copyText(newKeyValue, 'API key copied')}
                className="btn-ketoy btn-ketoy-secondary !px-2.5 !py-1.5 !text-xs"
              >
                Copy Key
              </button>
            </div>
            {newKeyId && <p className="mt-2 text-xs text-gray-300 font-mono">keyId: {newKeyId}</p>}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-base font-semibold">5b. List keys metadata</h2>
          <button
            type="button"
            onClick={loadKeys}
            className="btn-ketoy btn-ketoy-secondary !px-2.5 !py-1.5 !text-xs"
          >
            Refresh
          </button>
        </div>
        <div className="mb-3">
          <button
            type="button"
            onClick={() => copyText(snippets.list, 'List snippet copied')}
            className="btn-ketoy btn-ketoy-secondary !px-2.5 !py-1.5 !text-xs"
          >
            Copy 5b Curl
          </button>
        </div>

        {!String(apiKey || '').trim() ? (
          <p className="text-sm text-amber-200">Enter API key above and click Load Keys.</p>
        ) : loading ? (
          <p className="text-sm text-gray-400">Loading keys...</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-gray-500">No keys yet.</p>
        ) : (
          <div className="overflow-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-[#0f1c2e] text-gray-300">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">keyId</th>
                  <th className="text-left px-3 py-2 font-medium">label</th>
                  <th className="text-left px-3 py-2 font-medium">createdAt</th>
                  <th className="text-left px-3 py-2 font-medium">lastUsedAt</th>
                  <th className="text-right px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-[#111a2a]">
                {keys.map((key) => {
                  const id = key.keyId || key.id || key._id || ''
                  return (
                    <tr key={id || `${key.label}-${key.createdAt}`}>
                      <td className="px-3 py-2 font-mono text-xs text-gray-200">{id || '-'}</td>
                      <td className="px-3 py-2 text-gray-200">{key.label || '-'}</td>
                      <td className="px-3 py-2 text-gray-300">{formatDate(key.createdAt)}</td>
                      <td className="px-3 py-2 text-gray-300">{formatDate(key.lastUsedAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => copyText(id, 'Key ID copied')}
                            className="btn-ketoy btn-ketoy-secondary !px-2.5 !py-1.5 !text-xs"
                          >
                            Copy ID
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevoke(id)}
                            disabled={revokingId === id}
                            className="btn-ketoy btn-ketoy-danger !px-2.5 !py-1.5 !text-xs"
                          >
                            {revokingId === id ? 'Revoking...' : 'Revoke'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white text-sm font-semibold">5c. Revoke key (curl)</h3>
            <button onClick={() => copyText(snippets.revoke, 'Revoke snippet copied')} className="btn-ketoy btn-ketoy-secondary !px-2 !py-1 !text-xs">Copy</button>
          </div>
          <pre className="text-xs text-gray-300 bg-[#0f1c2e] rounded-lg p-3 overflow-auto whitespace-pre-wrap">{snippets.revoke}</pre>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white text-sm font-semibold">5d. Multiple keys strategy</h3>
            <button onClick={() => copyText(snippets.multiple, 'Multiple keys snippet copied')} className="btn-ketoy btn-ketoy-secondary !px-2 !py-1 !text-xs">Copy</button>
          </div>
          <pre className="text-xs text-gray-300 bg-[#0f1c2e] rounded-lg p-3 overflow-auto whitespace-pre-wrap">{snippets.multiple}</pre>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white text-sm font-semibold">5e. Error cases</h3>
            <button onClick={() => copyText(snippets.errors, 'Error cases snippet copied')} className="btn-ketoy btn-ketoy-secondary !px-2 !py-1 !text-xs">Copy</button>
          </div>
          <pre className="text-xs text-gray-300 bg-[#0f1c2e] rounded-lg p-3 overflow-auto whitespace-pre-wrap">{snippets.errors}</pre>
        </div>
      </section>

      {copyMessage && (
        <div className="fixed bottom-5 right-5 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-xs text-emerald-100">
          {copyMessage}
        </div>
      )}
    </div>
  )
}
