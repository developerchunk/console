import { useEffect, useState } from 'react'
import { screenAPI } from '../services/api'
import { mapApiErrorMessage, validateVersionCode, API_ERROR_MESSAGES } from '../services/ktwUtils'

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

const formatFileSize = (bytes) => {
  if (bytes == null) return 'N/A'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function VersionHistoryModal({ isOpen, onClose, bundleId, packageName, screenName, onLoadVersion }) {
  const [versions, setVersions] = useState([])
  const [currentVersion, setCurrentVersion] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedVersion, setSelectedVersion] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [loadingVersion, setLoadingVersion] = useState('')
  const [rolling, setRolling] = useState(false)
  const [pendingRollbackVersion, setPendingRollbackVersion] = useState('')
  const [rollbackNewVersion, setRollbackNewVersion] = useState('')
  const [rollbackErrorMessage, setRollbackErrorMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setFetchError(null)
      setSuccessMessage('')
      fetchVersions()
    } else {
      setFetchError(null)
      setSuccessMessage('')
    }
  }, [isOpen, packageName, screenName])

  useEffect(() => {
    if (!successMessage) return undefined

    const timer = window.setTimeout(() => {
      setSuccessMessage('')
    }, 4000)

    return () => window.clearTimeout(timer)
  }, [successMessage])

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl)
      }
    }
  }, [downloadUrl])

  const fetchVersions = async () => {
    setLoading(true)
    setFetchError(null)

    try {
      const response = await screenAPI.getVersions(packageName, screenName)
      const payload = response.data?.data || {}
      setCurrentVersion(payload.currentVersion || '')
      setVersions(Array.isArray(payload.items) ? payload.items : [])
      setSelectedVersion('')
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl)
        setDownloadUrl('')
      }
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) {
        setFetchError('Version history is not available in this environment.')
      } else {
        setFetchError(mapApiErrorMessage(err, 'Failed to load version history. Please try again.'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleViewVersion = async (version) => {
    setSelectedVersion(version)
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl)
      setDownloadUrl('')
    }

    setLoadingVersion(version)
    try {
      const response = await screenAPI.getByVersion(packageName, screenName, version)
      const blob = new Blob([response.data], { type: 'application/octet-stream' })
      setDownloadUrl(URL.createObjectURL(blob))
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) {
        setFetchError('Version history is not available in this environment.')
      } else {
        setFetchError(mapApiErrorMessage(err, 'Failed to load version file. Please try again.'))
      }
    } finally {
      setLoadingVersion('')
    }
  }

  const handleClose = () => {
    setFetchError(null)
    setSuccessMessage('')
    setPendingRollbackVersion('')
    setRollbackNewVersion('')
    setRollbackErrorMessage('')
    onClose()
  }

  const handleRollback = async () => {
    if (!pendingRollbackVersion) return

    // Validate the new version before calling API
    const validationError = validateVersionCode(rollbackNewVersion)
    if (validationError) {
      setRollbackErrorMessage(validationError)
      return
    }

    setRolling(true)
    setRollbackErrorMessage(null)

    try {
      const effectiveBundleId = bundleId || packageName
      const response = await screenAPI.rollback(effectiveBundleId, screenName, pendingRollbackVersion, rollbackNewVersion)
      const data = response.data?.data || {}
      const newVersionPublished = data.newVersion || rollbackNewVersion
      setSuccessMessage(`Version ${pendingRollbackVersion} restored and published as ${newVersionPublished}`)
      await fetchVersions()
      setSelectedVersion('')
      setPendingRollbackVersion('')
      setRollbackNewVersion('')
      setRollbackErrorMessage('')
      if (onLoadVersion) {
        onLoadVersion()
      }
    } catch (err) {
      const status = err?.response?.status
      const errorCode = err?.response?.data?.error?.code

      if (status === 409 || errorCode === 'CONFLICT' || errorCode === 'VERSION_TAKEN') {
        // Keep overlay open on 409 error, show inline error message
        const errorMessage = mapApiErrorMessage(err, API_ERROR_MESSAGES.VERSION_TAKEN)
        setRollbackErrorMessage(errorMessage)
      } else if (status === 404) {
        setFetchError('Version history is not available in this environment.')
        setPendingRollbackVersion('')
        setRollbackNewVersion('')
        setRollbackErrorMessage('')
      } else {
        setFetchError(mapApiErrorMessage(err, 'Failed to roll back the selected version.'))
        setPendingRollbackVersion('')
        setRollbackNewVersion('')
        setRollbackErrorMessage('')
      }
    } finally {
      setRolling(false)
    }
  }

  const handleDownload = () => {
    if (!downloadUrl || !selectedVersion) return

    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${screenName}-${selectedVersion}.ktw`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isOpen) return null

  const selectedVersionRow = versions.find((item) => item.version === selectedVersion)

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a2332] rounded-lg border border-gray-800 w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Version History</h2>
            <p className="text-sm text-gray-400 mt-1">{screenName}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#0f1c2e] rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          {successMessage && !fetchError && (
            <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-[13px] text-green-300">
              {successMessage}
            </div>
          )}

          {fetchError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <p>{fetchError}</p>
                <button
                  type="button"
                  onClick={() => setFetchError(null)}
                  className="px-2 py-1 rounded-md border border-red-400/40 bg-red-500/10 hover:bg-red-500/20 text-red-200 text-xs"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-hidden flex">
              <div className="w-[26rem] border-r border-gray-800 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <p className="text-gray-400">No KTW version history available</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {versions.map((item) => {
                      const isCurrent = item.version === currentVersion
                      return (
                        <div
                          key={item.version}
                          className={`p-4 cursor-pointer transition-colors ${
                            selectedVersion === item.version
                              ? 'bg-blue-500/10 border-l-4 border-blue-500 pl-3'
                              : 'hover:bg-[#0f1c2e]'
                          }`}
                          onClick={() => handleViewVersion(item.version)}
                        >
                          <div className="flex items-start justify-between mb-2 gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm text-blue-300">{item.version}</span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            {loadingVersion === item.version && (
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <p className="text-gray-400">Uploaded: {formatRelativeTime(item.uploadedAt)}</p>
                            <p className="text-gray-500">Size: {formatFileSize(item.ktwSizeBytes)}</p>
                            <p className="text-gray-400 col-span-2">By: {item.uploadedBy || 'unknown'}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                {selectedVersion ? (
                  <>
                    <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Version {selectedVersion}</h3>
                        <p className="text-sm text-gray-400 mt-1">{selectedVersionRow?.uploadedBy || 'unknown'} · {formatRelativeTime(selectedVersionRow?.uploadedAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        {selectedVersion !== currentVersion && (
                          <button
                            onClick={() => setPendingRollbackVersion(selectedVersion)}
                            disabled={rolling}
                            className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/50 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                          >
                            {rolling ? 'Rolling back...' : 'Rollback'}
                          </button>
                        )}
                        <button
                          onClick={handleDownload}
                          disabled={!downloadUrl}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          Download KTW
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto p-6 bg-[#0f1c2e]">
                      <p className="text-gray-300 text-sm">KTW version files are binary and can only be downloaded from the console.</p>
                      <p className="mt-2 text-xs text-gray-500 font-mono break-all">{downloadUrl ? 'Binary loaded for download.' : 'Loading binary...'}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>Select a version to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {pendingRollbackVersion && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-[#111b2b] rounded-2xl max-w-md w-full p-6 border border-amber-500/40 shadow-2xl shadow-black/40">
            <h3 className="text-lg font-bold text-white mb-3">Rollback this version?</h3>
            <p className="text-sm text-gray-300 mb-5">
              Rollback to <span className="font-mono text-white">{pendingRollbackVersion}</span>? This will create a new latest version with this content.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Publish restored content as</label>
              <input
                type="text"
                value={rollbackNewVersion}
                onChange={(e) => {
                  setRollbackNewVersion(e.target.value)
                  setRollbackErrorMessage('')
                }}
                placeholder="e.g. 1.0.2"
                disabled={rolling}
                className="w-full px-3 py-2 bg-[#0f1c2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 font-mono text-sm disabled:opacity-60"
              />
              {rollbackErrorMessage && (
                <p className="mt-2 text-sm text-red-400">{rollbackErrorMessage}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPendingRollbackVersion('')
                  setRollbackNewVersion('')
                  setRollbackErrorMessage('')
                }}
                disabled={rolling}
                className="flex-1 px-4 py-2 bg-[#0f1c2e] hover:bg-[#152235] text-white rounded-lg transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRollback}
                disabled={rolling}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {rolling ? 'Rolling back...' : 'Confirm Rollback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
