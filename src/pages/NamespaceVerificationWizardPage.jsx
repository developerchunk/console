import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { appAPI } from '../services/api'
import { isFreeTierApp, mapApiErrorMessage } from '../services/ktwUtils'
import { useAppStore } from '../store/appStore'

const formatCountdown = (expiresAt) => {
  const expiry = new Date(expiresAt).getTime()
  if (!expiry) return '-'
  const diff = Math.max(0, expiry - Date.now())
  const totalSeconds = Math.floor(diff / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

export default function NamespaceVerificationWizardPage() {
  const { appId } = useParams()
  const navigate = useNavigate()
  const { updateApp, setCurrentApp, currentApp } = useAppStore((state) => ({
    updateApp: state.updateApp,
    setCurrentApp: state.setCurrentApp,
    currentApp: state.currentApp
  }))

  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [verificationData, setVerificationData] = useState(null)
  const [appDetails, setAppDetails] = useState(null)
  const [countdown, setCountdown] = useState('-')

  const freeTier = useMemo(() => isFreeTierApp(appDetails?.bundleId || appDetails?.packageName || ''), [appDetails])

  const refreshTokenAndInstructions = async () => {
    const response = await appAPI.requestVerification(appId)
    const payload = response.data?.data || {}

    if (payload.verified || payload.domainVerified) {
      updateApp(appId, { domainVerified: true })
      setCurrentApp({ ...(currentApp || {}), domainVerified: true })
      setStatusMessage('Already verified. Redirecting back...')
      window.setTimeout(() => navigate(`/projects/${encodeURIComponent(appId)}`, { replace: true }), 900)
      return
    }

    setVerificationData(payload)
    setStatusMessage('Add the TXT record, then click Check.')
  }

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const detailResponse = await appAPI.getDetails(appId)
        const app = detailResponse.data?.data?.app || detailResponse.data?.data || detailResponse.data || {}
        setAppDetails(app)

        if (app.domainVerified) {
          setStatusMessage('Namespace already verified.')
          setLoading(false)
          return
        }

        if (!isFreeTierApp(app.bundleId || app.packageName || '')) {
          await refreshTokenAndInstructions()
        }
      } catch (err) {
        setError(mapApiErrorMessage(err, 'Failed to load verification wizard'))
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [appId])

  useEffect(() => {
    if (!verificationData?.expiresAt) return

    setCountdown(formatCountdown(verificationData.expiresAt))
    const timer = window.setInterval(() => {
      setCountdown(formatCountdown(verificationData.expiresAt))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [verificationData?.expiresAt])

  const handleCheck = async () => {
    setChecking(true)
    setError('')

    try {
      const response = await appAPI.checkVerification(appId)
      const payload = response.data?.data || {}

      if (payload.verified) {
        const verifiedPatch = {
          domainVerified: true,
          verifiedAt: payload.verifiedAt,
          dnsTarget: payload.dnsTarget,
          verifiedDomain: payload.dnsTarget
        }
        updateApp(appId, verifiedPatch)
        setCurrentApp({ ...(currentApp || {}), ...verifiedPatch })
        setStatusMessage('Namespace verified successfully. Closing wizard...')
        window.setTimeout(() => navigate(`/projects/${encodeURIComponent(appId)}`, { replace: true }), 1000)
        return
      }

      setStatusMessage(payload.reason || 'DNS not propagated yet. Try again in a few minutes.')
    } catch (err) {
      const code = err?.response?.data?.error?.code
      if (code === 'NO_PENDING_VERIFICATION' || code === 'TOKEN_EXPIRED') {
        await refreshTokenAndInstructions()
      } else {
        setError(mapApiErrorMessage(err, 'Verification check failed'))
      }
    } finally {
      setChecking(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-gray-400 text-sm">Loading verification wizard...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Namespace Verification</h1>
        <Link to={`/projects/${encodeURIComponent(appId)}`} className="btn-ketoy btn-ketoy-secondary">Back to App</Link>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 text-sm">
          {error}
        </div>
      )}

      {statusMessage && (
        <div className="mb-4 p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-200 text-sm">
          {statusMessage}
        </div>
      )}

      {freeTier ? (
        <div className="rounded-xl border border-slate-400/40 bg-slate-500/10 p-4 text-slate-200 text-sm">
          This app is in your free namespace ({appDetails?.bundleId || appDetails?.packageName}). It is auto-verified and does not require DNS TXT verification.
        </div>
      ) : appDetails?.domainVerified ? (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-green-200 text-sm">
          Namespace already verified for {appDetails?.bundleId || appDetails?.packageName}.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#121d2f] p-4">
          <p className="text-sm text-gray-300 mb-3">Add this TXT record to your DNS provider (Cloudflare, Route 53, etc.), then click Check.</p>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-400">Type:</span> <span className="font-mono text-white">TXT</span></p>
            <p><span className="text-gray-400">Name:</span> <span className="font-mono text-white">{verificationData?.txtRecord?.host || '-'}</span></p>
            <p><span className="text-gray-400">Value:</span> <span className="font-mono text-white">{verificationData?.txtRecord?.value || '-'}</span></p>
            <p><span className="text-gray-400">TTL:</span> <span className="font-mono text-white">300</span></p>
            <p><span className="text-gray-400">Expires in:</span> <span className="font-mono text-amber-300">{countdown}</span></p>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={handleCheck} disabled={checking} className="btn-ketoy btn-ketoy-primary">
              {checking ? 'Checking...' : 'Check'}
            </button>
            <button onClick={refreshTokenAndInstructions} disabled={checking} className="btn-ketoy btn-ketoy-secondary">
              Refresh Token
            </button>
          </div>
        </div>
      )}
    </div>
  )
}