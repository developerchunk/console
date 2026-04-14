import { useEffect, useState } from 'react'
import { useScreenStore } from '../store/screenStore'
import { screenAPI } from '../services/api'
import { mapApiErrorMessage, prepareKtwUploadBinary, validateKtwFile, validateVersionCode } from '../services/ktwUtils'

export default function CreateScreenModal({ isOpen, onClose, packageName, onSuccess }) {
  const { addScreen } = useScreenStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [screenName, setScreenName] = useState('')
  const [ktwFile, setKtwFile] = useState(null)
  const [uploadVersion, setUploadVersion] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setLoading(false)
      setError(null)
      setScreenName('')
      setKtwFile(null)
      setUploadVersion('')
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const normalizedScreenName = screenName.trim()
    if (!normalizedScreenName) {
      setError('Screen name is required.')
      setLoading(false)
      return
    }

    if (!ktwFile) {
      setError('Select a .ktw file to upload.')
      setLoading(false)
      return
    }

    const versionValidationError = validateVersionCode(uploadVersion)
    if (versionValidationError) {
      setError(versionValidationError)
      setLoading(false)
      return
    }

    try {
      const fileValidationError = await validateKtwFile(ktwFile)
      if (fileValidationError) {
        throw new Error(fileValidationError)
      }

      const { binary } = await prepareKtwUploadBinary(ktwFile)
      const response = await screenAPI.uploadKtw(packageName, normalizedScreenName, binary, uploadVersion)
      const newScreen = response.data?.data || response.data
      addScreen(newScreen)

      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err) {
      setError(mapApiErrorMessage(err, 'Failed to upload screen'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1a2332] rounded-lg max-w-2xl w-full p-6 border border-gray-800 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4">Upload KTW Screen</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Screen Name *
            </label>
            <input
              type="text"
              value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
              placeholder="home_screen"
              required
              pattern="^[a-zA-Z0-9._-]+$"
              className="w-full px-4 py-2 bg-[#0f1c2e] border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white select-text"
            />
            <p className="mt-1 text-xs text-gray-500">Use letters, numbers, dots, hyphens, and underscores only.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              KTW File *
            </label>
            <div className="rounded-lg border border-white/10 bg-[#0f1c2e] px-3 py-2.5">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="create-screen-ktw-file"
                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-[#1A73E8] hover:bg-[#1765cc] text-white text-sm font-medium cursor-pointer transition-colors"
                >
                  Choose KTW File
                </label>
                <span className="text-xs text-gray-400 truncate">
                  {ktwFile ? ktwFile.name : 'No file selected'}
                </span>
              </div>
              <input
                id="create-screen-ktw-file"
                type="file"
                onChange={(e) => setKtwFile(e.target.files?.[0] || null)}
                className="sr-only"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">Use a valid .ktw export file under 1 MB.</p>
            {ktwFile && (
              <p className="mt-2 text-xs text-gray-400 font-mono">
                Selected: {ktwFile.name} ({ktwFile.size.toLocaleString()} bytes)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Version Code
            </label>
            <input
              type="text"
              value={uploadVersion}
              onChange={(e) => setUploadVersion(e.target.value)}
              placeholder="1.0.0"
              className="w-full px-4 py-2 bg-[#0f1c2e] border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white"
            />
            <p className="mt-1 text-xs text-gray-500">Enter a semantic version like 1.0.0.</p>
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
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
