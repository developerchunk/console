import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useScreenStore } from '../store/screenStore'
import { appAPI, bundleAPI, screenAPI, keyAPI } from '../services/api'
import BundleSnapshotModal from '../components/BundleSnapshotModal'
import CreateScreenModal from '../components/CreateScreenModal'
import VersionHistoryModal from '../components/VersionHistoryModal'
import { API_ERROR_MESSAGES, fileToBase64, formatDateTime, formatKtwSizeKb, isFreeTierApp, mapApiErrorMessage, prepareKtwUploadBinary, validateKtwFile, validateVersionCode } from '../services/ktwUtils'

const DetailStat = ({ label, value, accent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
    <span style={{ fontSize: 22, fontWeight: 600, color: accent ? '#60a5fa' : '#fff', letterSpacing: '-0.02em' }}>{value}</span>
  </div>
)

export default function ProjectDetailPage() {
  const { packageName } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentApp, setCurrentApp } = useAppStore()
  const { screens, setScreens } = useScreenStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [nextToken, setNextToken] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [snapshots, setSnapshots] = useState([])
  const [snapshotsError, setSnapshotsError] = useState(null)
  const [snapshotsLoading, setSnapshotsLoading] = useState(false)
  const [snapshotsNextToken, setSnapshotsNextToken] = useState(null)
  const [loadingMoreSnapshots, setLoadingMoreSnapshots] = useState(false)
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('')
  const [promotingSnapshotId, setPromotingSnapshotId] = useState('')
  const [confirmPromoteSnapshotId, setConfirmPromoteSnapshotId] = useState('')
  const [promoteMessage, setPromoteMessage] = useState('')
  const [promoteError, setPromoteError] = useState('')
  const [search, setSearch] = useState('')
  const [historyScreenId, setHistoryScreenId] = useState('')
  const [bundleFiles, setBundleFiles] = useState([])
  const [bundleVersion, setBundleVersion] = useState('')
  const [bundleUploadError, setBundleUploadError] = useState('')
  const [bundleUploadMessage, setBundleUploadMessage] = useState('')
  const [bundleUploadResults, setBundleUploadResults] = useState([])
  const [bundleUploading, setBundleUploading] = useState(false)
  const [promoteNewVersion, setPromoteNewVersion] = useState('')
  const [screenPendingDelete, setScreenPendingDelete] = useState('')
  const [screenDeleting, setScreenDeleting] = useState(false)
  const [bundleUploadResult] = useState(location.state?.bundleUploadResult || null)
  const [verificationData, setVerificationData] = useState(null)
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [checkingVerification, setCheckingVerification] = useState(false)
  const [verificationReason, setVerificationReason] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [verificationToast, setVerificationToast] = useState('')
  const [apiKeys, setApiKeys] = useState([])
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [apiKeysError, setApiKeysError] = useState('')
  const [apiKeyLabel, setApiKeyLabel] = useState('')
  const [creatingApiKey, setCreatingApiKey] = useState(false)
  const [revokingApiKeyId, setRevokingApiKeyId] = useState('')
  const [newDeveloperApiKey, setNewDeveloperApiKey] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const activePackageRef = useRef(packageName)
  const appReqIdRef = useRef(0)
  const screensReqIdRef = useRef(0)
  const snapshotsReqIdRef = useRef(0)
  const apiKeysReqIdRef = useRef(0)

  const bundleUploadData = (() => {
    const payload = bundleUploadResult?.data?.data || bundleUploadResult?.data || bundleUploadResult
    return payload && typeof payload === 'object' ? payload : null
  })()

  const processedCount = Number(bundleUploadData?.processed ?? 0)
  const succeededCount = Number(bundleUploadData?.succeeded ?? 0)
  const failedCount = Number(bundleUploadData?.failed ?? 0)
  const isBundleAllSucceeded = Boolean(bundleUploadData) && processedCount > 0 && succeededCount === processedCount
  const hasBundleFailures = Boolean(bundleUploadData) && failedCount > 0

  useEffect(() => {
    activePackageRef.current = packageName
    setCurrentApp(null)
    setScreens([])
    setSnapshots([])
    setNextToken(null)
    setSnapshotsNextToken(null)
    setError(null)
    setSnapshotsError(null)

    fetchAppDetails(packageName)
    fetchScreens({ targetPackage: packageName })
    fetchSnapshots({ targetPackage: packageName })
  }, [packageName, setCurrentApp, setScreens])

  useEffect(() => {
    if (!bundleUploadData) return
    fetchScreens({ targetPackage: packageName })
    fetchSnapshots({ targetPackage: packageName })
  }, [bundleUploadData?.snapshotId, bundleUploadData?.updatedAt, packageName])

  const timeAgo = (dateString) => {
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

  const getUpdatedByEmail = (screen) => {
    const updatedBy = screen?.updatedBy
    if (!updatedBy) return 'unknown'

    if (typeof updatedBy === 'string') return updatedBy
    return updatedBy.email || updatedBy.username || 'unknown'
  }

  const fetchAppDetails = async (targetPackage = packageName) => {
    const requestId = ++appReqIdRef.current

    try {
      const response = await appAPI.getDetails(targetPackage)
      if (requestId !== appReqIdRef.current || activePackageRef.current !== targetPackage) return

      const appData = response.data?.data?.app || response.data?.data || response.data
      setCurrentApp(appData)
    } catch (err) {
      if (requestId !== appReqIdRef.current || activePackageRef.current !== targetPackage) return
      setError(mapApiErrorMessage(err, 'Failed to fetch app details'))
    }
  }

  const showVerificationToast = (message) => {
    setVerificationToast(message)
    window.setTimeout(() => setVerificationToast(''), 2500)
  }

  const handleCopyToClipboard = async (value) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      showVerificationToast('Copied to clipboard')
    } catch {
      setVerificationError('Failed to copy. Please copy manually.')
    }
  }

  const handleRequestVerification = async () => {
    setVerificationLoading(true)
    setVerificationError('')
    setVerificationReason('')

    try {
      const response = await appAPI.requestVerification(packageName)
      const payload = response.data?.data || {}
      setVerificationData(payload)
    } catch (err) {
      setVerificationData(null)
      setVerificationError(mapApiErrorMessage(err, 'Failed to request DNS verification token'))
    } finally {
      setVerificationLoading(false)
    }
  }

  const handleCheckVerification = async () => {
    setCheckingVerification(true)
    setVerificationError('')

    try {
      const response = await appAPI.checkVerification(packageName)
      const payload = response.data?.data || {}

      if (payload.verified) {
        const verifiedDomain = payload.dnsTarget || verificationData?.txtRecord?.host || currentApp?.verifiedDomain || ''
        setCurrentApp({
          ...(currentApp || {}),
          domainVerified: true,
          verifiedDomain,
          verifiedAt: payload.verifiedAt || currentApp?.verifiedAt
        })
        setVerificationData(null)
        setVerificationReason('')
        showVerificationToast('Namespace locked to your account')
        return
      }

      setVerificationReason(payload.reason || 'DNS record not found yet. Please try again.')
    } catch (err) {
      const errorCode = err?.response?.data?.error?.code
      setVerificationError(mapApiErrorMessage(err, 'Failed to check DNS verification'))

      if (errorCode === 'NO_PENDING_VERIFICATION' || errorCode === 'TOKEN_EXPIRED') {
        setVerificationData(null)
        setVerificationReason('')
      }
    } finally {
      setCheckingVerification(false)
    }
  }

  const getApiKeyPrefix = () => `${appBundleId}::`

  const loadApiKeys = async (targetBundleId = appBundleId) => {
    const requestId = ++apiKeysReqIdRef.current
    setApiKeysLoading(true)
    setApiKeysError('')

    try {
      const response = await keyAPI.list()
      if (requestId !== apiKeysReqIdRef.current) return

      const payload = response.data?.data || response.data || {}
      const items = Array.isArray(payload) ? payload : Array.isArray(payload.items) ? payload.items : []
      const prefix = `${targetBundleId}::`
      const appScoped = items.filter((key) => String(key?.label || '').startsWith(prefix))
      setApiKeys(appScoped)
    } catch (err) {
      if (requestId !== apiKeysReqIdRef.current) return
      setApiKeysError(mapApiErrorMessage(err, 'Failed to load API keys'))
      setApiKeys([])
    } finally {
      if (requestId !== apiKeysReqIdRef.current) return
      setApiKeysLoading(false)
    }
  }

  const handleCreateApiKey = async () => {
    const normalizedLabel = String(apiKeyLabel || '').trim()
    const scopedLabel = `${getApiKeyPrefix()}${normalizedLabel || 'default'}`
    setCreatingApiKey(true)
    setApiKeysError('')

    try {
      const response = await keyAPI.create(scopedLabel)
      const payload = response.data?.data || response.data || {}
      setNewDeveloperApiKey(payload.key || '')
      setApiKeyLabel('')
      await loadApiKeys()
    } catch (err) {
      setApiKeysError(mapApiErrorMessage(err, 'Failed to create API key'))
    } finally {
      setCreatingApiKey(false)
    }
  }

  const handleRevokeApiKey = async (keyId) => {
    if (!keyId) return
    const confirmed = window.confirm('Revoke this API key? This cannot be undone.')
    if (!confirmed) return

    setRevokingApiKeyId(keyId)
    setApiKeysError('')
    try {
      await keyAPI.revoke(keyId)
      setApiKeys((prev) => prev.filter((key) => (key.keyId || key.id || key._id) !== keyId))
    } catch (err) {
      setApiKeysError(mapApiErrorMessage(err, 'Failed to revoke API key'))
    } finally {
      setRevokingApiKeyId('')
    }
  }

  const fetchScreens = async ({ append = false, token = null, targetPackage = packageName } = {}) => {
    const requestId = ++screensReqIdRef.current

    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await screenAPI.getAll(targetPackage, token ? { nextToken: token } : {})
      if (requestId !== screensReqIdRef.current || activePackageRef.current !== targetPackage) return

      const payload = response.data?.data
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : []
      const incomingScreens = Array.isArray(items) ? items : []

      if (append) {
        setScreens((prev) => [...prev, ...incomingScreens])
      } else {
        setScreens(incomingScreens)
      }

      setNextToken(Array.isArray(payload) ? null : payload?.nextToken || null)
      setError(null)
    } catch (err) {
      if (requestId !== screensReqIdRef.current || activePackageRef.current !== targetPackage) return
      setError(mapApiErrorMessage(err, 'Failed to fetch screens'))
    } finally {
      if (requestId !== screensReqIdRef.current || activePackageRef.current !== targetPackage) return
      if (append) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }

  const fetchSnapshots = async ({ append = false, token = null, targetPackage = packageName } = {}) => {
    const requestId = ++snapshotsReqIdRef.current

    if (append) {
      setLoadingMoreSnapshots(true)
    } else {
      setSnapshotsLoading(true)
    }

    try {
      const response = await bundleAPI.getAll(targetPackage, token ? { nextToken: token } : {})
      if (requestId !== snapshotsReqIdRef.current || activePackageRef.current !== targetPackage) return

      const payload = response.data?.data || {}
      const incoming = Array.isArray(payload.items) ? payload.items : []

      setSnapshots((prev) => (append ? [...prev, ...incoming] : incoming))
      setSnapshotsNextToken(payload.nextToken || null)
      setSnapshotsError(null)
    } catch (err) {
      if (requestId !== snapshotsReqIdRef.current || activePackageRef.current !== targetPackage) return
      const status = err?.response?.status
      // If bundles API is not deployed in this environment yet, keep section usable with empty state.
      if (status === 404 || status === 501) {
        setSnapshots([])
        setSnapshotsNextToken(null)
        setSnapshotsError(null)
      } else {
        setSnapshotsError(mapApiErrorMessage(err, 'Failed to fetch bundle snapshots'))
      }
    } finally {
      if (requestId !== snapshotsReqIdRef.current || activePackageRef.current !== targetPackage) return
      if (append) {
        setLoadingMoreSnapshots(false)
      } else {
        setSnapshotsLoading(false)
      }
    }
  }

  const handleLoadMore = () => {
    if (!nextToken || loadingMore) return
    fetchScreens({ append: true, token: nextToken })
  }

  const handleLoadMoreSnapshots = () => {
    if (!snapshotsNextToken || loadingMoreSnapshots) return
    fetchSnapshots({ append: true, token: snapshotsNextToken })
  }

  const formatBytes = (bytes) => {
    if (bytes == null) return null
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDeleteApp = async () => {
    try {
      await appAPI.delete(packageName)
      navigate('/projects')
    } catch (err) {
      setError(mapApiErrorMessage(err, 'Failed to delete app'))
    }
  }

  const handleDeleteScreen = async () => {
    if (!screenPendingDelete) return

    setScreenDeleting(true)
    try {
      await screenAPI.delete(packageName, screenPendingDelete)
      setScreenPendingDelete('')
      await fetchScreens()
    } catch (err) {
      setError(mapApiErrorMessage(err, 'Failed to delete screen'))
    } finally {
      setScreenDeleting(false)
    }
  }

  const handlePromoteSnapshot = async (snapshot) => {
    const normalizedVersion = String(promoteNewVersion || '').trim()
    const validationError = validateVersionCode(normalizedVersion)
    if (validationError) {
      setPromoteError(validationError)
      return
    }

    setPromotingSnapshotId(snapshot.snapshotId)
    setPromoteError('')
    setPromoteMessage('')

    try {
      const detailResponse = await bundleAPI.getDetails(packageName, snapshot.snapshotId)
      const detail = detailResponse.data?.data || {}
      const screenIds = Object.keys(detail.screens || {})

      if (screenIds.length === 0) {
        setPromoteError('No screens found in this snapshot. Cannot promote.')
        return
      }

      const response = await bundleAPI.promote(packageName, snapshot.snapshotId, normalizedVersion, screenIds)
      const data = response.data?.data || {}
      const promotedBundleVersion = data.newBundleVersion || data.bundleVersion || normalizedVersion
      const screenResults = Array.isArray(data.results)
        ? data.results.filter((item) => item?.ok).map((item) => `${item.screenId}:${item.newVersion || item.version || '-'}`)
        : []
      const versionsLine = screenResults.length > 0 ? ` Screens: ${screenResults.join(', ')}` : ''
      setPromoteMessage(promotedBundleVersion ? `Promoted successfully. Bundle version ${promotedBundleVersion}.${versionsLine}` : 'Promoted successfully.')
      setConfirmPromoteSnapshotId('')
      setPromoteNewVersion('')
      await fetchScreens()
      await fetchSnapshots()
    } catch (err) {
      const status = err?.response?.status
      const errorCode = err?.response?.data?.error?.code
      if (status === 409 || errorCode === 'VERSION_TAKEN') {
        setPromoteError(mapApiErrorMessage(err, API_ERROR_MESSAGES.VERSION_TAKEN))
      } else {
        setPromoteError(mapApiErrorMessage(err, 'Failed to promote snapshot'))
      }
    } finally {
      setPromotingSnapshotId('')
    }
  }

  const handleBundleFilesChange = (event) => {
    setBundleUploadMessage('')
    setBundleUploadError('')
    setBundleFiles(Array.from(event.target.files || []))
  }

  const normalizeScreenId = (fileName) => {
    return fileName.replace(/\.ktw$/i, '').trim()
  }

  const handleBundleUpload = async () => {
    if (bundleFiles.length === 0) {
      setBundleUploadError('Select one or more .ktw files to upload.')
      return
    }

    if (bundleFiles.length > 50) {
      setBundleUploadError('Bundle exceeds 50 screens')
      return
    }

    const normalizedBundleVersion = String(bundleVersion || '').trim()
    const versionValidationError = validateVersionCode(normalizedBundleVersion)
    if (versionValidationError) {
      setBundleUploadError(versionValidationError)
      return
    }

    setBundleUploading(true)
    setBundleUploadMessage('')
    setBundleUploadResults([])
    setBundleUploadError('')

    try {
      const payload = []
      for (const file of bundleFiles) {
        const screenId = normalizeScreenId(file.name)
        if (!screenId) {
          throw new Error(`Invalid file name: ${file.name}`)
        }

        const validationError = await validateKtwFile(file)
        if (validationError) {
          throw new Error(`${file.name}: ${validationError}`)
        }

        const { binary } = await prepareKtwUploadBinary(file)
        const ktw = await fileToBase64(binary)
        payload.push({ screenId, ktw })
      }

      const response = await screenAPI.uploadBundleKtw(packageName, payload, normalizedBundleVersion)
      const data = response.data?.data || {}
      const snapshotId = data.snapshotId
      const uploadedBundleVersion = data.bundleVersion || normalizedBundleVersion
      setBundleUploadResults(Array.isArray(data.results) ? data.results : [])
      setBundleUploadMessage(uploadedBundleVersion
        ? `Bundle uploaded successfully. Bundle version ${uploadedBundleVersion}${snapshotId ? ` · Snapshot ${snapshotId}` : ''}`
        : 'Bundle uploaded successfully.')

      await fetchScreens()
      await fetchSnapshots()
    } catch (err) {
      setBundleUploadError(mapApiErrorMessage(err, 'Failed to upload bundle'))
    } finally {
      setBundleUploading(false)
    }
  }

  const formatSnapshotId = (snapshotId) => {
    if (!snapshotId) return '-'
    return `${snapshotId.slice(0, 8)}...`
  }

  const getSnapshotVersionLabel = (snapshot, index) => {
    const explicitVersion = snapshot?.version || snapshot?.bundleVersion || snapshot?.versionLabel
    if (explicitVersion) return String(explicitVersion)
    return `v${index + 1}`
  }

  const totalScreens = screens.length
  const totalSnapshots = snapshots.length
  const appRef = currentApp?.appId || currentApp?.id || currentApp?.packageName || currentApp?.bundleId || packageName
  const appBundleId = currentApp?.bundleId || currentApp?.packageName || packageName
  const freeTierApp = isFreeTierApp(appBundleId)
  const latestActivity = screens.length > 0
    ? timeAgo(screens[0]?.updatedAt || screens[0]?.createdAt)
    : 'No updates yet'
  const filteredScreens = screens.filter((s) => {
    const name = (s.displayName || s.screenName || '').toLowerCase()
    const id = (s.screenId || '').toLowerCase()
    const query = search.toLowerCase()
    return name.includes(query) || id.includes(query)
  })

  useEffect(() => {
    if (activeTab !== 'apikeys' || !appBundleId) return
    loadApiKeys(appBundleId)
  }, [activeTab, appBundleId])

  const tabs = [
    { id: 'overview',  label: 'Overview' },
    { id: 'screens',   label: `Screens${screens.length > 0 ? `  ${screens.length}` : ''}` },
    { id: 'bundles',   label: `Bundles${snapshots.length > 0 ? `  ${snapshots.length}` : ''}` },
    { id: 'apikeys',   label: 'API Keys' },
    { id: 'danger',    label: 'Danger' },
  ]

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .pd-anim { animation: fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .pd-anim-1 { animation-delay: 0ms; }
        .pd-anim-2 { animation-delay: 60ms; }
        .pd-anim-3 { animation-delay: 100ms; }

        .pd-tab-bar {
          display: flex;
          gap: 2px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 28px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .pd-tab-bar::-webkit-scrollbar { display: none; }

        .pd-tab {
          padding: 10px 18px;
          font-size: 13.5px;
          font-weight: 500;
          color: rgba(255,255,255,0.42);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
          white-space: nowrap;
          margin-bottom: -1px;
        }
        .pd-tab:hover { color: rgba(255,255,255,0.75); }
        .pd-tab.active {
          color: #93c5fd;
          border-bottom-color: #3b82f6;
          font-weight: 600;
        }

        .pd-search {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 9px 14px 9px 40px;
          color: #f1f5f9;
          font-size: 13.5px;
          outline: none;
          width: 100%;
          max-width: 320px;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .pd-search::placeholder { color: rgba(255,255,255,0.28); }
        .pd-search:focus {
          border-color: rgba(26,115,232,0.55);
          box-shadow: 0 0 0 3px rgba(26,115,232,0.1);
        }

        .screen-row {
          display: grid;
          grid-template-columns: 1fr 90px 80px 140px 140px 160px;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          transition: background 0.15s;
        }
        .screen-row:last-child { border-bottom: none; }
        .screen-row:hover { background: rgba(255,255,255,0.025); }

        .pd-info-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 13px;
        }
        .pd-info-row:last-child { border-bottom: none; }

        .snap-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 16px 20px;
          transition: border-color 0.18s;
        }
        .snap-card:hover { border-color: rgba(26,115,232,0.3); }

        .section-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          overflow: hidden;
        }

        .section-header {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6 pd-anim pd-anim-1">
        <Link to="/projects" className="text-gray-400 hover:text-white hover:underline">
          App
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-white">{currentApp?.appName || packageName}</span>
      </div>

      {/* ── Page header ── */}
      <div className="pd-anim pd-anim-1" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg, rgba(26,115,232,0.22), rgba(26,115,232,0.06))', border: '1px solid rgba(26,115,232,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {currentApp?.appName || packageName}
              </h1>
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                {currentApp?.packageName || packageName}
              </p>
            </div>
          </div>

          {currentApp?.description && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', maxWidth: 520, marginTop: 4 }}>
              {currentApp.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setIsModalOpen(true); setActiveTab('screens') }}
            className="btn-ketoy btn-ketoy-primary"
          >
            + Add Screen
          </button>
        </div>
      </div>

      {/* ── Stat strip ── */}
      <div className="pd-anim pd-anim-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Screens', value: totalScreens, accent: true },
          { label: 'Bundle Versions', value: totalSnapshots },
          { label: 'Last Activity', value: latestActivity },
        ].map(({ label, value, accent }) => (
          <div key={label} style={{
            padding: '14px 18px',
            borderRadius: 13,
            background: accent ? 'linear-gradient(135deg, rgba(26,115,232,0.12), rgba(26,115,232,0.04))' : 'rgba(255,255,255,0.025)',
            border: accent ? '1px solid rgba(26,115,232,0.25)' : '1px solid rgba(255,255,255,0.07)',
          }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: accent ? '#60a5fa' : '#f1f5f9', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div className="pd-tab-bar pd-anim pd-anim-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`pd-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Global error ── */}
      {error && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 10, color: '#fca5a5', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ════════════ TAB: OVERVIEW ════════════ */}
      {activeTab === 'overview' && (
        <div className="pd-anim pd-anim-3" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* App info */}
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600 }}>App Info</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 }}>Resource identifiers and usage notes</p>
              </div>
            </div>
            <div style={{ padding: '4px 20px 16px' }}>
              {[
                { key: 'App Resource ID', val: currentApp?.appId || currentApp?.id || currentApp?._id || packageName, mono: true, canCopy: true },
                { key: 'Bundle ID', val: appBundleId, mono: true },
                { key: 'Auth header', val: 'X-Api-Key: <Developer API Key>', mono: true },
              ].map(({ key, val, mono, canCopy }) => (
                <div key={key} className="pd-info-row">
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', width: 140, flexShrink: 0 }}>{key}</span>
                  <span style={{ fontSize: 13, color: '#e2e8f0', fontFamily: mono ? 'monospace' : undefined, flex: 1, wordBreak: 'break-all' }}>{val}</span>
                  {canCopy && (
                    <button
                      type="button"
                      onClick={() => handleCopyToClipboard(String(val))}
                      className="btn-ketoy btn-ketoy-secondary !px-2.5 !py-1 !text-xs flex-shrink-0"
                    >
                      Copy
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Namespace */}
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600 }}>Namespace</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 }}>Domain ownership and verification</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {freeTierApp ? (
                  <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.3)', color: '#94a3b8', fontSize: 11.5, fontWeight: 600 }}>
                    Free Tier
                  </span>
                ) : currentApp?.domainVerified ? (
                  <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.4)', color: '#86efac', fontSize: 11.5, fontWeight: 600 }}>
                    Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/apps/${encodeURIComponent(appRef)}/verify`)}
                    className="btn-ketoy btn-ketoy-primary !text-xs !py-1.5 !px-3"
                  >
                    Start Verification
                  </button>
                )}
              </div>
            </div>
            <div style={{ padding: '4px 20px 16px' }}>
              {[
                { key: 'bundleId', val: appBundleId },
                ...(currentApp?.domainVerified ? [
                  { key: 'dnsTarget', val: currentApp?.dnsTarget || currentApp?.verifiedDomain || '-' },
                  { key: 'verifiedAt', val: formatDateTime(currentApp?.verifiedAt) },
                ] : []),
              ].map(({ key, val }) => (
                <div key={key} className="pd-info-row">
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', width: 140, flexShrink: 0, fontFamily: 'monospace' }}>{key}</span>
                  <span style={{ fontSize: 13, color: '#e2e8f0', fontFamily: 'monospace', flex: 1 }}>{val}</span>
                </div>
              ))}
              {!freeTierApp && !currentApp?.domainVerified && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d', fontSize: 12.5 }}>
                  Namespace unverified. Verify to permanently lock ownership to your account.
                </div>
              )}
              {freeTierApp && (
                <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.45)', fontSize: 12.5 }}>
                  dev.ketoy apps can upload screens directly without domain verification.
                </p>
              )}
            </div>
          </div>

          {/* Bundle upload result banner */}
          {bundleUploadData && (
            <div style={{ padding: '14px 18px', borderRadius: 13, background: isBundleAllSucceeded ? 'rgba(22,163,74,0.1)' : 'rgba(234,179,8,0.08)', border: isBundleAllSucceeded ? '1px solid rgba(22,163,74,0.35)' : '1px solid rgba(234,179,8,0.35)', color: isBundleAllSucceeded ? '#86efac' : '#fde68a' }}>
              {isBundleAllSucceeded ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13.5 }}>All {processedCount} screens uploaded successfully.</p>
                    {bundleUploadData?.snapshotId && (
                      <p style={{ fontSize: 11.5, opacity: 0.75, marginTop: 3 }}>Snapshot: {String(bundleUploadData.snapshotId).slice(0, 8)}…</p>
                    )}
                  </div>
                  {bundleUploadData?.snapshotId && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('bundles')}
                      style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(22,163,74,0.2)', border: '1px solid rgba(34,197,94,0.4)', color: '#86efac', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
                    >
                      View in Bundles →
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <p style={{ fontWeight: 600, fontSize: 13.5 }}>{succeededCount} of {processedCount} screens uploaded.</p>
                  <p style={{ fontSize: 11.5, opacity: 0.7, marginTop: 3 }}>{failedCount} failed</p>
                </div>
              )}

              {hasBundleFailures && Array.isArray(bundleUploadData?.results) && (
                <div style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(234,179,8,0.25)' }}>
                  <table style={{ width: '100%', fontSize: 12 }}>
                    <thead style={{ background: 'rgba(234,179,8,0.08)', color: '#fde68a' }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>screenId</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>status</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>size / error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bundleUploadData.results.map((result, index) => (
                        <tr key={`${result?.screenId || 'r'}-${index}`} style={{ borderTop: '1px solid rgba(234,179,8,0.15)' }}>
                          <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: '#fde68a' }}>{result?.screenId || '-'}</td>
                          <td style={{ padding: '7px 12px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: result?.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: result?.ok ? '#86efac' : '#fca5a5' }}>
                              {result?.ok ? 'ok' : 'failed'}
                            </span>
                          </td>
                          <td style={{ padding: '7px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 11.5 }}>
                            {result?.ok
                              ? `${result?.sizeBytes ?? result?.ktwSizeBytes ?? '-'} B`
                              : (result?.error || 'Unknown error')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════ TAB: SCREENS ════════════ */}
      {activeTab === 'screens' && (
        <div className="pd-anim pd-anim-3">
          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 340 }}>
              <svg style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'rgba(255,255,255,0.28)', pointerEvents: 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search screens…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pd-search"
              />
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
              {filteredScreens.length} screen{filteredScreens.length !== 1 ? 's' : ''}
            </span>
            <button onClick={() => setIsModalOpen(true)} className="btn-ketoy btn-ketoy-primary">
              + Add Screen
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 14 }}>
              <div style={{ width: 28, height: 28, border: '2px solid rgba(26,115,232,0.2)', borderTopColor: '#1A73E8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Loading screens…</p>
            </div>
          ) : filteredScreens.length === 0 ? (
            <div style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 16, padding: '60px 24px', textAlign: 'center' }}>
              <svg style={{ width: 40, height: 40, margin: '0 auto 12px', color: 'rgba(255,255,255,0.14)', display: 'block' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                {search ? 'No matching screens' : 'No screens yet'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                {search ? 'Try a different search term' : 'Add your first SDUI screen above'}
              </p>
            </div>
          ) : (
            <div className="section-card">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(15,28,46,0.8)' }}>
                      {['Screen ID', 'Version', 'Size', 'Updated', 'By', ''].map((h) => (
                        <th key={h} style={{ textAlign: h === '' ? 'right' : 'left', padding: '11px 16px', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScreens.map((screen) => {
                      const screenId = screen.screenId || screen.screenName
                      const normalizedScreenId = String(screenId || '').trim()
                      return (
                        <tr key={normalizedScreenId || screen.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.12s' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: '#f1f5f9', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{screenId || '—'}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#93c5fd', fontSize: 12 }}>{screen.version || '—'}</td>
                          <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.45)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatKtwSizeKb(screen.ktwSizeBytes)}</td>
                          <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.45)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDateTime(screen.updatedAt || screen.createdAt)}</td>
                          <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.38)', fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getUpdatedByEmail(screen)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                              <button type="button" onClick={() => setHistoryScreenId(normalizedScreenId)} className="btn-ketoy btn-ketoy-secondary !px-2.5 !py-1.5 !text-xs">
                                History
                              </button>
                              <Link to={`/projects/${encodeURIComponent(packageName)}/screens/${encodeURIComponent(normalizedScreenId)}`} className="btn-ketoy btn-ketoy-primary !px-2.5 !py-1.5 !text-xs">
                                Open
                              </Link>
                              <button onClick={() => setScreenPendingDelete(normalizedScreenId)} className="btn-ketoy btn-ketoy-danger !px-2.5 !py-1.5 !text-xs">
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && nextToken && screens.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <button onClick={handleLoadMore} disabled={loadingMore} className="btn-ketoy btn-ketoy-primary">
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════ TAB: BUNDLES ════════════ */}
      {activeTab === 'bundles' && (
        <div className="pd-anim pd-anim-3" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Upload section */}
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600 }}>Upload Bundle</h2>
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, marginTop: 2 }}>Upload up to 50 .ktw files. Screen IDs are derived from file names.</p>
              </div>
              <Link to={`/projects/${packageName}/bundles`} className="btn-ketoy btn-ketoy-secondary !text-xs">
                Full View
              </Link>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <label htmlFor="bundle-ktw-files" className="btn-ketoy btn-ketoy-secondary" style={{ cursor: 'pointer' }}>
                Choose Files
              </label>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', flex: '1 1 100px' }}>
                {bundleFiles.length > 0 ? `${bundleFiles.length} file${bundleFiles.length > 1 ? 's' : ''} selected` : 'No files selected'}
              </span>
              <input id="bundle-ktw-files" type="file" multiple onChange={handleBundleFilesChange} className="sr-only" />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap' }}>Bundle Version</span>
                <input
                  type="text"
                  value={bundleVersion}
                  onChange={(e) => { setBundleVersion(e.target.value); setBundleUploadError('') }}
                  placeholder="e.g. 1.0.0"
                  style={{ background: '#0f1c2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#fff', fontFamily: 'monospace', width: 120, outline: 'none' }}
                />
              </div>
              <button
                type="button"
                onClick={handleBundleUpload}
                disabled={bundleUploading || bundleFiles.length === 0}
                className="btn-ketoy btn-ketoy-primary"
              >
                {bundleUploading ? 'Uploading…' : `Upload${bundleFiles.length ? ` (${bundleFiles.length})` : ''}`}
              </button>
            </div>

            {bundleUploadError && (
              <div style={{ margin: '0 20px 16px', padding: '10px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)', color: '#fca5a5', fontSize: 13 }}>
                {bundleUploadError}
              </div>
            )}
            {bundleUploadMessage && (
              <div style={{ margin: '0 20px 16px', padding: '10px 14px', borderRadius: 9, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.28)', color: '#86efac', fontSize: 13 }}>
                {bundleUploadMessage}
              </div>
            )}
            {bundleUploadResults.length > 0 && (
              <div style={{ margin: '0 20px 16px', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'rgba(15,28,46,0.8)' }}>
                    <tr>
                      {['Screen', 'Status', 'Version', 'Size'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bundleUploadResults.map((result, i) => (
                      <tr key={`${result?.screenId}-${i}`} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#e2e8f0' }}>{result?.screenId || '-'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: result?.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: result?.ok ? '#86efac' : '#fca5a5' }}>
                            {result?.ok ? 'ok' : 'failed'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#93c5fd' }}>{result?.version || '—'}</td>
                        <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.45)' }}>{result?.ktwSizeBytes ?? result?.sizeBytes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Snapshots list */}
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600 }}>Bundle Versions</h2>
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, marginTop: 2 }}>Inspect or promote previously uploaded bundles.</p>
              </div>
            </div>

            {promoteMessage && (
              <div style={{ margin: '12px 20px 0', padding: '10px 14px', borderRadius: 9, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.28)', color: '#86efac', fontSize: 13 }}>
                {promoteMessage}
              </div>
            )}
            {promoteError && (
              <div style={{ margin: '12px 20px 0', padding: '10px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)', color: '#fca5a5', fontSize: 13 }}>
                {promoteError}
              </div>
            )}
            {snapshotsError && (
              <div style={{ margin: '12px 20px 0', padding: '10px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)', color: '#fca5a5', fontSize: 13 }}>
                {snapshotsError}
              </div>
            )}

            <div style={{ padding: '12px 20px 20px' }}>
              {snapshotsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 12 }}>
                  <div style={{ width: 26, height: 26, border: '2px solid rgba(26,115,232,0.2)', borderTopColor: '#1A73E8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Loading bundle versions…</p>
                </div>
              ) : snapshots.length === 0 ? (
                <div style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 13, padding: '40px 24px', textAlign: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No bundle versions yet.</p>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12.5, marginTop: 4 }}>Use ketoyPushAll or the upload above to create one.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {snapshots.map((snapshot, index) => {
                    const isConfirming = confirmPromoteSnapshotId === snapshot.snapshotId
                    const isPromoting = promotingSnapshotId === snapshot.snapshotId
                    const versionLabel = getSnapshotVersionLabel(snapshot, index)

                    return (
                      <div key={snapshot.snapshotId} className="snap-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontWeight: 700, fontSize: 13.5, color: '#f1f5f9' }}>v{versionLabel}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }} title={snapshot.snapshotId}>
                              {formatSnapshotId(snapshot.snapshotId)}
                            </span>
                            <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: snapshot.type === 'ktw' ? 'rgba(167,139,250,0.15)' : 'rgba(59,130,246,0.15)', border: snapshot.type === 'ktw' ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(59,130,246,0.35)', color: snapshot.type === 'ktw' ? '#c4b5fd' : '#93c5fd' }}>
                              {(snapshot.type || 'json').toUpperCase()}
                            </span>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{snapshot.screenCount || 0} screens · {timeAgo(snapshot.uploadedAt)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" onClick={() => setSelectedSnapshotId(snapshot.snapshotId)} className="btn-ketoy btn-ketoy-primary !px-3 !py-1.5 !text-xs">
                              Inspect
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPromoteError('')
                                setPromoteMessage('')
                                setPromoteNewVersion('')
                                setConfirmPromoteSnapshotId((prev) => prev === snapshot.snapshotId ? '' : snapshot.snapshotId)
                              }}
                              className="btn-ketoy btn-ketoy-amber !px-3 !py-1.5 !text-xs"
                            >
                              Promote
                            </button>
                          </div>
                        </div>

                        {isConfirming && (
                          <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 11, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.3)' }}>
                            <p style={{ fontSize: 13, color: '#fde68a', marginBottom: 10 }}>
                              Promote v{versionLabel}? This overwrites all {snapshot.screenCount || 0} screens. Previous content is preserved in history.
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: 11, color: 'rgba(253,230,138,0.7)', marginBottom: 4 }}>New Bundle Version</label>
                                <input
                                  type="text"
                                  value={promoteNewVersion}
                                  onChange={(e) => { setPromoteNewVersion(e.target.value); setPromoteError('') }}
                                  placeholder="e.g. 2.0.0"
                                  style={{ background: '#0f1c2e', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, color: '#fff', fontFamily: 'monospace', width: 160, outline: 'none' }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
                                <button type="button" onClick={() => handlePromoteSnapshot(snapshot)} disabled={isPromoting} className="btn-ketoy btn-ketoy-amber !px-3 !py-1.5 !text-xs">
                                  {isPromoting ? 'Promoting…' : 'Confirm'}
                                </button>
                                <button type="button" onClick={() => setConfirmPromoteSnapshotId('')} disabled={isPromoting} className="btn-ketoy btn-ketoy-secondary !px-3 !py-1.5 !text-xs">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {!snapshotsLoading && snapshotsNextToken && snapshots.length > 0 && (
              <div style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'center' }}>
                <button type="button" onClick={handleLoadMoreSnapshots} disabled={loadingMoreSnapshots} className="btn-ketoy btn-ketoy-primary">
                  {loadingMoreSnapshots ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════ TAB: API KEYS ════════════ */}
      {activeTab === 'apikeys' && (
        <div className="pd-anim pd-anim-3">
          <div className="section-card">
            <div className="section-header">
              <div>
                <h2 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600 }}>API Keys</h2>
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, marginTop: 2 }}>
                  Keys scoped to this app — label prefix: <code style={{ fontFamily: 'monospace', color: '#93c5fd', fontSize: 12 }}>{getApiKeyPrefix()}*</code>
                </p>
              </div>
              <button type="button" onClick={loadApiKeys} className="btn-ketoy btn-ketoy-secondary !px-3 !py-1.5 !text-xs">
                Refresh
              </button>
            </div>

            {/* Create key */}
            <div style={{ padding: '16px 20px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <input
                type="text"
                value={apiKeyLabel}
                onChange={(e) => setApiKeyLabel(e.target.value)}
                placeholder="Label (e.g. local, ci, staging)"
                style={{ background: '#0f1c2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#fff', flex: '1 1 180px', maxWidth: 300, outline: 'none' }}
              />
              <button type="button" onClick={handleCreateApiKey} disabled={creatingApiKey} className="btn-ketoy btn-ketoy-primary">
                {creatingApiKey ? 'Creating…' : 'Create Key'}
              </button>
            </div>

            {apiKeysError && (
              <div style={{ margin: '12px 20px', padding: '10px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)', color: '#fca5a5', fontSize: 13 }}>
                {apiKeysError}
              </div>
            )}

            {newDeveloperApiKey && (
              <div style={{ margin: '12px 20px', padding: '14px 16px', borderRadius: 11, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fde68a', marginBottom: 8 }}>Copy this key now — it won't be shown again.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 12.5, color: '#86efac', wordBreak: 'break-all' }}>{newDeveloperApiKey}</code>
                  <button type="button" onClick={async () => { await navigator.clipboard.writeText(newDeveloperApiKey); showVerificationToast('Copied'); setNewDeveloperApiKey('') }} className="btn-ketoy btn-ketoy-secondary !px-2.5 !py-1.5 !text-xs">Copy</button>
                  <button type="button" onClick={() => setNewDeveloperApiKey('')} className="btn-ketoy btn-ketoy-secondary !px-2.5 !py-1.5 !text-xs">✕</button>
                </div>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              {apiKeysLoading ? (
                <div style={{ padding: '24px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Loading…</div>
              ) : apiKeys.length === 0 ? (
                <div style={{ padding: '24px 20px', color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>No API keys for this app yet.</div>
              ) : (
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(15,28,46,0.6)' }}>
                      {['Label', 'Key ID', 'Created', 'Last Used', ''].map((h) => (
                        <th key={h} style={{ textAlign: h === '' ? 'right' : 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map((key) => {
                      const id = key.keyId || key.id || key._id || ''
                      const prefix = getApiKeyPrefix()
                      const rawLabel = String(key.label || '')
                      const scopedLabel = rawLabel.startsWith(prefix) ? rawLabel.slice(prefix.length) : rawLabel
                      return (
                        <tr key={id || rawLabel} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '11px 16px', color: '#e2e8f0', fontWeight: 500 }}>{scopedLabel || 'default'}</td>
                          <td style={{ padding: '11px 16px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{id ? `${String(id).slice(0, 8)}…` : '—'}</td>
                          <td style={{ padding: '11px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDateTime(key.createdAt)}</td>
                          <td style={{ padding: '11px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 12, whiteSpace: 'nowrap' }}>{key.lastUsedAt ? formatDateTime(key.lastUsedAt) : 'Never'}</td>
                          <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                            <button type="button" onClick={() => handleRevokeApiKey(id)} disabled={revokingApiKeyId === id} className="btn-ketoy btn-ketoy-danger !px-2.5 !py-1.5 !text-xs">
                              {revokingApiKeyId === id ? 'Revoking…' : 'Revoke'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════ TAB: DANGER ════════════ */}
      {activeTab === 'danger' && (
        <div className="pd-anim pd-anim-3">
          <div style={{ border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.04)' }}>
              <h2 style={{ color: '#f87171', fontSize: 15, fontWeight: 600 }}>Danger Zone</h2>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, marginTop: 2 }}>Irreversible actions. Proceed with caution.</p>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 500 }}>Delete this app</p>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, marginTop: 3, maxWidth: 440 }}>
                    Removes the app from your workspace. Retrieval possible within 15 days.
                    {snapshots.length > 0 && ` Warning: ${snapshots.length} bundle snapshot(s) will become orphaned.`}
                  </p>
                </div>
                <button onClick={() => setShowDeleteConfirm(true)} className="btn-ketoy btn-ketoy-danger flex-shrink-0">
                  Delete App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODALS ════════ */}
      {isModalOpen && (
        <CreateScreenModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          packageName={packageName}
          onSuccess={fetchScreens}
        />
      )}

      {selectedSnapshotId && (
        <BundleSnapshotModal
          isOpen={Boolean(selectedSnapshotId)}
          onClose={() => setSelectedSnapshotId('')}
          bundleId={packageName}
          snapshotId={selectedSnapshotId}
        />
      )}

      {historyScreenId && (
        <VersionHistoryModal
          isOpen={Boolean(historyScreenId)}
          onClose={() => setHistoryScreenId('')}
          bundleId={packageName}
          packageName={packageName}
          screenName={historyScreenId}
          onLoadVersion={fetchScreens}
        />
      )}

      {screenPendingDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111b2b] rounded-2xl max-w-md w-full p-6 border border-red-500/40 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-3">Delete screen?</h2>
            <p className="text-gray-300 mb-6 text-sm">
              Delete screen <code className="font-mono text-white">"{screenPendingDelete}"</code>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setScreenPendingDelete('')} disabled={screenDeleting} className="btn-ketoy btn-ketoy-secondary flex-1">Cancel</button>
              <button onClick={handleDeleteScreen} disabled={screenDeleting} className="btn-ketoy btn-ketoy-danger flex-1">
                {screenDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111b2b] rounded-2xl max-w-md w-full p-6 border border-red-500/40 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-3">Delete app?</h2>
            <p className="text-gray-300 mb-6 text-sm">
              This removes the app from your workspace. You can request retrieval within 15 days.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-ketoy btn-ketoy-secondary flex-1">Cancel</button>
              <button onClick={handleDeleteApp} className="btn-ketoy btn-ketoy-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}

      {verificationToast && (
        <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 60, padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.45)', background: 'rgba(22,163,74,0.18)', color: '#dcfce7', fontSize: 13, fontWeight: 600, backdropFilter: 'blur(8px)' }}>
          {verificationToast}
        </div>
      )}
      </div>
    </>
  )
}
