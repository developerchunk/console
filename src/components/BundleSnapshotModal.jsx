import { useEffect, useState } from 'react'
import { bundleAPI, screenAPI } from '../services/api'

const truncate = (value, size = 8) => {
  if (!value) return '-'
  return value.length > size ? `${value.slice(0, size)}...` : value
}

const formatRelativeTime = (dateString) => {
  if (!dateString) return 'just now'

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'just now'

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`

  const diffYears = Math.floor(diffMonths / 12)
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`
}

const formatBytes = (bytes) => {
  if (bytes == null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function BundleSnapshotModal({ isOpen, onClose, bundleId, snapshotId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [snapshot, setSnapshot] = useState(null)
  const [previewLoadingId, setPreviewLoadingId] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [previewScreenId, setPreviewScreenId] = useState('')
  const [previewJson, setPreviewJson] = useState('')
  const [ktwDownloadUrl, setKtwDownloadUrl] = useState('')
  const [ktwDownloading, setKtwDownloading] = useState(false)

  useEffect(() => {
    if (!isOpen || !snapshotId) return

    fetchSnapshotDetails()
  }, [isOpen, snapshotId, bundleId])

  useEffect(() => {
    return () => {
      if (ktwDownloadUrl) {
        URL.revokeObjectURL(ktwDownloadUrl)
      }
    }
  }, [ktwDownloadUrl])

  const fetchSnapshotDetails = async () => {
    setLoading(true)
    setError('')
    setPreviewError('')
    setPreviewScreenId('')
    setPreviewJson('')
    if (ktwDownloadUrl) {
      URL.revokeObjectURL(ktwDownloadUrl)
      setKtwDownloadUrl('')
    }

    try {
      const response = await bundleAPI.getDetails(bundleId, snapshotId)
      setSnapshot(response.data?.data || null)
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Failed to load snapshot details')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async (screenId, version) => {
    setPreviewError('')
    setPreviewScreenId(screenId)
    setPreviewJson('')
    if (ktwDownloadUrl) {
      URL.revokeObjectURL(ktwDownloadUrl)
      setKtwDownloadUrl('')
    }

    const snapshotType = snapshot?.type === 'ktw' ? 'ktw' : 'json'

    if (snapshotType === 'ktw') {
      setPreviewLoadingId('')
      return
    }

    setPreviewLoadingId(screenId)

    try {
      const response = await screenAPI.getByVersion(bundleId, screenId, version)
      const payload = response.data?.data || response.data || {}
      setPreviewJson(JSON.stringify(payload.definition || payload.ui || payload, null, 2))
    } catch (err) {
      setPreviewError(err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Failed to preview version')
    } finally {
      setPreviewLoadingId('')
    }
  }

  const handleDownloadKtw = async () => {
    if (!previewScreenId) return

    setKtwDownloading(true)
    setPreviewError('')

    try {
      const response = await screenAPI.fetchPublicKtw(bundleId, previewScreenId)
      const blob = new Blob([response.data], { type: 'application/vnd.ketoy.ktw' })
      const url = URL.createObjectURL(blob)
      setKtwDownloadUrl(url)

      const link = document.createElement('a')
      link.href = url
      link.download = `${previewScreenId}.ktw`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      setPreviewError(err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Failed to download KTW binary')
    } finally {
      setKtwDownloading(false)
    }
  }

  if (!isOpen) return null

  const rows = snapshot?.screens && typeof snapshot.screens === 'object'
    ? Object.entries(snapshot.screens)
    : []

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl border border-white/15 bg-[#1a2332]/95 shadow-2xl shadow-black/40 flex flex-col">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Bundle Version</h2>
            <p className="text-xs text-gray-400 mt-1">Inspect screens and preview bundled version content</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-auto p-6 border-b xl:border-b-0 xl:border-r border-white/10">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && error && (
              <div className="p-3 rounded-lg border border-red-500/50 bg-red-500/10 text-red-300 text-sm">
                {error}
              </div>
            )}

            {!loading && !error && snapshot && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5 text-sm">
                  <div className="rounded-lg bg-[#0f1c2e] border border-white/10 p-3">
                    <p className="text-gray-400 text-xs">Snapshot ID</p>
                    <p className="text-white font-mono mt-1">{snapshot.snapshotId}</p>
                  </div>
                  <div className="rounded-lg bg-[#0f1c2e] border border-white/10 p-3">
                    <p className="text-gray-400 text-xs">Bundle Version</p>
                    <p className="text-blue-300 font-mono mt-1">{snapshot.bundleVersion || '—'}</p>
                  </div>
                  <div className="rounded-lg bg-[#0f1c2e] border border-white/10 p-3">
                    <p className="text-gray-400 text-xs">Type</p>
                    <p className={`font-semibold mt-1 ${snapshot.type === 'ktw' ? 'text-violet-300' : 'text-blue-300'}`}>
                      {(snapshot.type || 'json').toUpperCase()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#0f1c2e] border border-white/10 p-3">
                    <p className="text-gray-400 text-xs">Uploaded</p>
                    <p className="text-white mt-1">{formatRelativeTime(snapshot.uploadedAt)}</p>
                  </div>
                  <div className="rounded-lg bg-[#0f1c2e] border border-white/10 p-3">
                    <p className="text-gray-400 text-xs">Uploaded By</p>
                    <p className="text-white mt-1">{snapshot.uploadedBy || '-'}</p>
                  </div>
                  <div className="rounded-lg bg-[#0f1c2e] border border-white/10 p-3">
                    <p className="text-gray-400 text-xs">Screens</p>
                    <p className="text-white mt-1">{snapshot.screenCount || rows.length}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-[#0f1c2e] text-gray-300">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Screen ID</th>
                        <th className="text-left px-3 py-2 font-medium">Version</th>
                        <th className="text-left px-3 py-2 font-medium">Size</th>
                        <th className="text-right px-3 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {rows.map(([screenId, meta]) => (
                        <tr key={screenId} className="bg-[#142033]/60">
                          <td className="px-3 py-2 text-white font-mono">{screenId}</td>
                          <td className="px-3 py-2 text-gray-300 font-mono">{meta?.version || '-'}</td>
                          <td className="px-3 py-2 text-gray-300">{formatBytes(meta?.ktwSizeBytes)}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => handlePreview(screenId, meta?.version)}
                              disabled={previewLoadingId === screenId}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1A73E8] hover:bg-[#1765cc] disabled:opacity-50 text-white transition-colors"
                            >
                              {previewLoadingId === screenId ? 'Loading...' : 'Preview'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="overflow-auto p-6 bg-[#0f1c2e]/70">
            <h3 className="text-white font-semibold text-base mb-2">Preview</h3>
            {!previewScreenId && (
              <p className="text-sm text-gray-400">Select a screen row and click Preview to inspect snapshot content.</p>
            )}

            {previewError && (
              <div className="mb-3 p-3 rounded-lg border border-red-500/50 bg-red-500/10 text-red-300 text-sm">
                {previewError}
              </div>
            )}

            {previewScreenId && snapshot?.type !== 'ktw' && (
              <>
                <p className="text-xs text-gray-400 mb-2">Screen: <span className="text-gray-200">{previewScreenId}</span></p>
                <pre className="text-xs text-gray-200 bg-[#111a2a] border border-white/10 rounded-lg p-3 overflow-auto max-h-[58vh] whitespace-pre-wrap break-words">
                  {previewJson || 'Loading...'}
                </pre>
              </>
            )}

            {previewScreenId && snapshot?.type === 'ktw' && (
              <div className="text-sm text-gray-300">
                <p>KTW binary - not previewable in console</p>
                <p className="text-xs text-gray-400 mt-1">Screen: {previewScreenId}</p>
                <button
                  type="button"
                  onClick={handleDownloadKtw}
                  disabled={ktwDownloading}
                  className="mt-4 inline-flex items-center px-4 py-2 rounded-lg border text-sm font-medium transition-colors bg-blue-500/20 hover:bg-blue-500/30 border-blue-400/50 text-blue-300 disabled:opacity-60"
                >
                  {ktwDownloading ? 'Downloading...' : 'Download KTW'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
