import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useScreenStore } from '../store/screenStore'
import { screenAPI } from '../services/api'
import VersionHistoryModal from '../components/VersionHistoryModal'
import { mapApiErrorMessage, prepareKtwUploadBinary, validateKtwFile, validateVersionCode } from '../services/ktwUtils'

export default function ScreenEditorPage() {
  const { packageName: routePackageName, screenName: routeScreenName } = useParams()
  const { currentScreen, setCurrentScreen } = useScreenStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadVersion, setUploadVersion] = useState('')
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [screenMeta, setScreenMeta] = useState(null)

  const sanitizeRouteId = (value) => {
    if (!value) return ''
    try {
      return decodeURIComponent(value).trim()
    } catch {
      return String(value).trim()
    }
  }

  const packageName = sanitizeRouteId(routePackageName)
  const screenName = sanitizeRouteId(routeScreenName)

  useEffect(() => {
    fetchScreenDetails()
  }, [packageName, screenName])

  const fetchScreenDetails = async () => {
    setLoading(true)

    if (!packageName || !screenName) {
      setCurrentScreen(null)
      setScreenMeta(null)
      setError('Invalid appId or screenId')
      setLoading(false)
      return
    }

    try {
      const response = await screenAPI.getDetails(packageName, screenName)
      const payload = response.data?.data || response.data
      const screen = payload.screen || payload
      setCurrentScreen(screen || null)
      setScreenMeta(screen || null)
      setUploadVersion((prev) => prev || screen?.version || '')
      setError(null)
    } catch (err) {
      const status = err?.response?.status
      const code = err?.response?.data?.error?.code

      // Allow upload-first flow even when screen metadata has not been created yet.
      if (status === 404 || code === 'NOT_FOUND') {
        setCurrentScreen(null)
        setScreenMeta(null)
        setError(null)
        return
      }

      setError(mapApiErrorMessage(err, 'Failed to fetch screen details'))
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] || null)
    setUploadMessage('')
    setError(null)
  }

  const handleUpload = async () => {
    const validationError = await validateKtwFile(selectedFile)
    if (validationError) {
      setError(validationError)
      return
    }

    const versionValidationError = validateVersionCode(uploadVersion)
    if (versionValidationError) {
      setError(versionValidationError)
      return
    }

    setSaving(true)
    setError(null)
    setUploadMessage('')

    try {
      const { binary } = await prepareKtwUploadBinary(selectedFile)
      const response = await screenAPI.uploadKtw(packageName, screenName, binary, uploadVersion)
      setUploadMessage('KTW uploaded successfully.')
      setSelectedFile(null)
      await fetchScreenDetails()
    } catch (err) {
      setError(mapApiErrorMessage(err, 'Failed to upload screen'))
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadCurrent = async () => {
    setError(null)

    try {
      const response = await screenAPI.fetchPublicKtw(packageName, screenName)
      const blob = new Blob([response.data], { type: 'application/vnd.ketoy.ktw' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${screenName}.ktw`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (err) {
      setError(mapApiErrorMessage(err, 'Failed to download current KTW'))
    }
  }

  const screenSummary = useMemo(() => {
    const size = screenMeta?.ktwSizeBytes ?? screenMeta?.sizeBytes ?? null
    const updatedAtRaw = screenMeta?.updatedAt || screenMeta?.createdAt || null
    let updatedTimeLabel = null
    if (updatedAtRaw) {
      const date = new Date(updatedAtRaw)
      if (!Number.isNaN(date.getTime())) {
        updatedTimeLabel = date.toLocaleString()
      }
    }

    return {
      sizeLabel: size == null ? '-' : `${Number(size).toLocaleString()} bytes`,
      updatedAt: updatedTimeLabel,
      key: screenMeta?.ktwKey || screenMeta?.key || null
    }
  }, [screenMeta])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#070b12]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-400">Loading screen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link to="/projects" className="text-gray-400 hover:text-white hover:underline">App</Link>
        <span className="text-gray-600">/</span>
        <Link to={`/projects/${packageName}`} className="text-gray-400 hover:text-white hover:underline">{packageName}</Link>
        <span className="text-gray-600">/</span>
        <span className="text-white">{currentScreen?.displayName || screenName}</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Screen Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{currentScreen?.displayName || screenName}</h1>
          <p className="mt-2 text-xs text-gray-500">Upload, version, and download the current KTW binary for this screen.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={handleDownloadCurrent}
            className="btn-ketoy btn-ketoy-secondary inline-flex items-center gap-2"
            title="Download current KTW"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
            </svg>
            <span className="text-sm">Download current KTW</span>
          </button>

          <button
            onClick={() => setShowVersionHistory(true)}
            className="btn-ketoy btn-ketoy-secondary inline-flex items-center gap-2"
            title="Version History"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">History</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
          <div className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs px-2.5 py-1 rounded border border-red-400/40 hover:bg-red-500/20 text-red-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {uploadMessage && (
        <div className="mb-4 ketoy-card-surface-soft rounded-2xl border border-white/10 px-4 py-3 text-sm text-gray-200 pd-fade pd-fade-2">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Upload complete</p>
              <p className="mt-1 text-sm text-gray-300">{uploadMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="ketoy-card-surface rounded-xl p-5 border border-white/10">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Upload New KTW</p>
              <h2 className="text-lg font-semibold text-white mt-2">{currentScreen?.displayName || screenName}</h2>
              <p className="text-sm text-gray-400 mt-2">This screen is served as a binary .ktw file. JSON editing is no longer supported.</p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Screen ID</label>
                  <input
                    type="text"
                    value={screenName}
                    readOnly
                    className="w-full px-4 py-2 bg-[#0f1c2e] border border-gray-700 rounded-lg text-white/80 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Choose .ktw file</label>
                  <div className="rounded-lg border border-white/10 bg-[#0f1c2e] px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor="screen-editor-ktw-file"
                        className="btn-ketoy btn-ketoy-primary inline-flex items-center cursor-pointer"
                      >
                        Choose File
                      </label>
                      <span className="text-xs text-gray-400 truncate">
                        {selectedFile ? selectedFile.name : 'No file selected'}
                      </span>
                    </div>
                    <input
                      id="screen-editor-ktw-file"
                      type="file"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Use a valid .ktw export file under 1 MB.</p>
                </div>

                {selectedFile && (
                  <div className="rounded-lg border border-white/10 bg-[#0f1c2e] p-3 text-sm text-gray-300">
                    <p className="font-medium text-white">Selected file</p>
                    <p className="mt-1 font-mono break-all">{selectedFile.name}</p>
                    <p className="mt-1 text-gray-400">{selectedFile.size.toLocaleString()} bytes</p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Version code</label>
                    <input
                      type="text"
                      value={uploadVersion}
                      onChange={(event) => setUploadVersion(event.target.value)}
                      placeholder="1.0.3"
                      className="bg-[#0f1c2e] border border-gray-700 rounded-md px-2.5 py-1.5 text-sm text-white w-32"
                    />
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={saving || !selectedFile}
                    className="btn-ketoy btn-ketoy-primary"
                  >
                    {saving ? 'Uploading...' : 'Upload KTW'}
                  </button>
                  <button
                    onClick={fetchScreenDetails}
                    className="btn-ketoy btn-ketoy-secondary"
                  >
                    Refresh
                  </button>
                </div>
              </div>
        </div>

        <div className="ketoy-card-surface rounded-xl p-5 border border-white/10">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Current Screen Info</p>
          <div className="mt-4 space-y-3 text-sm text-gray-300">
            <div className="flex justify-between gap-4"><span className="text-gray-500">App</span><span className="text-white font-mono text-right">{packageName}</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500">Screen</span><span className="text-white font-mono text-right">{screenName}</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500">Size</span><span className="text-white text-right">{screenSummary.sizeLabel}</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500">Updated</span><span className="text-white text-right">{screenSummary.updatedAt || '—'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500">KTW Key</span><span className="text-white font-mono text-right break-all">{screenSummary.key || '—'}</span></div>
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-white/10 bg-[#0f1c2e] p-4 text-sm text-gray-400">
            KTW binaries cannot be rendered inside the console preview. Use version history or the download action to inspect the current file.
          </div>
        </div>
      </div>

      <VersionHistoryModal
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        bundleId={packageName}
        packageName={packageName}
        screenName={screenName}
        onLoadVersion={fetchScreenDetails}
      />
    </div>
  )
}
