import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { appAPI } from '../services/api'
import { getDisplayUsername } from '../services/userDisplay'
import CreateAppModal from '../components/CreateAppModal'

const timeAgo = (dateString) => {
  if (!dateString) return 'Just now'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Just now'
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}mo ago`
  return `${Math.floor(diffMonths / 12)}y ago`
}

const IconBox = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
)

const IconClock = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const IconShield = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

const IconSearch = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
  </svg>
)

const IconArrow = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" />
  </svg>
)

const IconPlus = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
  </svg>
)

const IconFolderX = () => (
  <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
      d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13l2 2 4-4" />
  </svg>
)

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { apps, setApps, setLoading, loading, error, setError } = useAppStore()
  const { developer } = useAuthStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [nextToken, setNextToken] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'verified' | 'unverified'

  useEffect(() => {
    fetchApps()
  }, [])

  const fetchApps = async ({ append = false, token = null } = {}) => {
    if (append) setLoadingMore(true)
    else setLoading(true)

    try {
      const response = await appAPI.getAll(token ? { nextToken: token } : {})
      const payload = response.data?.data
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : []
      const incomingApps = Array.isArray(items) ? items : []

      if (append) setApps([...apps, ...incomingApps])
      else setApps(incomingApps)

      setNextToken(Array.isArray(payload) ? null : payload?.nextToken || null)
      setError(null)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch apps')
    } finally {
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  }

  const handleLoadMore = () => {
    if (!nextToken || loadingMore) return
    fetchApps({ append: true, token: nextToken })
  }

  const sortedApps = [...apps].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime()
    const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime()
    return rightTime - leftTime
  })

  const validApps = sortedApps.filter(
    (app) => app && (app.appName || app.packageName || app.bundleId || app.appId || app.id)
  )

  const verifiedCount = validApps.filter((a) => Boolean(a.domainVerified)).length
  const unverifiedCount = validApps.length - verifiedCount
  const lastActivity = validApps.length > 0
    ? timeAgo(validApps[0].updatedAt || validApps[0].createdAt)
    : '—'

  const filtered = validApps
    .filter((a) => {
      if (filter === 'verified') return Boolean(a.domainVerified)
      if (filter === 'unverified') return !Boolean(a.domainVerified)
      return true
    })
    .filter(
      (a) =>
        (a.appName || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.packageName || '').toLowerCase().includes(search.toLowerCase())
    )

  const displayName = String(getDisplayUsername(developer) || '').trim()
  const welcomeName = displayName || null

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes cardAuraDrift {
          0% { transform: translate3d(-28%, -22%, 0) rotate(0deg); }
          50% { transform: translate3d(10%, 12%, 0) rotate(180deg); }
          100% { transform: translate3d(-28%, -22%, 0) rotate(360deg); }
        }

        .ps-anim { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        .ps-anim-1 { animation-delay: 0ms; }
        .ps-anim-2 { animation-delay: 70ms; }
        .ps-anim-3 { animation-delay: 130ms; }
        .ps-anim-4 { animation-delay: 180ms; }

        .stat-card {
          position: relative;
          border-radius: 14px;
          padding: 20px;
          overflow: hidden;
          isolation: isolate;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: border-color 0.2s;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          left: -42%;
          top: -55%;
          width: 170%;
          height: 170%;
          border-radius: 40%;
          background: radial-gradient(circle at 30% 30%, rgba(96,165,250,0.22), rgba(59,130,246,0.1) 34%, rgba(59,130,246,0) 62%);
          filter: blur(14px);
          animation: cardAuraDrift 16s linear infinite;
          opacity: 0.14;
          pointer-events: none;
          z-index: 0;
        }
        .stat-card::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(145deg, rgba(255,255,255,0.03), rgba(15,23,42,0.22));
          opacity: 0.45;
          pointer-events: none;
          z-index: 0;
        }
        .stat-card > * {
          position: relative;
          z-index: 1;
        }
        .stat-card-primary {
          background: linear-gradient(135deg, rgba(26,115,232,0.15) 0%, rgba(26,115,232,0.05) 100%);
          border: 1px solid rgba(26,115,232,0.3);
        }
        .stat-card-secondary {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .stat-card-green {
          background: linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%);
          border: 1px solid rgba(34,197,94,0.25);
        }

        .ps-search {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 9px 14px 9px 40px;
          color: #f1f5f9;
          font-size: 13.5px;
          outline: none;
          width: 100%;
          max-width: 360px;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .ps-search::placeholder { color: rgba(255,255,255,0.28); }
        .ps-search:focus {
          border-color: rgba(26,115,232,0.55);
          box-shadow: 0 0 0 3px rgba(26,115,232,0.1);
        }

        .filter-tab {
          padding: 5px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 500;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          background: transparent;
          color: rgba(255,255,255,0.45);
        }
        .filter-tab:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.05); }
        .filter-tab.active {
          background: rgba(26,115,232,0.15);
          border-color: rgba(26,115,232,0.4);
          color: #93c5fd;
        }

        .proj-card {
          position: relative;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 20px;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          gap: 16px;
          cursor: pointer;
          overflow: hidden;
          isolation: isolate;
          transition: background 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .proj-card::before {
          content: '';
          position: absolute;
          left: -48%;
          top: -62%;
          width: 180%;
          height: 180%;
          border-radius: 42%;
          background: radial-gradient(circle at 35% 30%, rgba(96,165,250,0.18), rgba(59,130,246,0.08) 35%, rgba(59,130,246,0) 64%);
          filter: blur(16px);
          animation: cardAuraDrift 17s linear infinite;
          opacity: 0.1;
          pointer-events: none;
          z-index: 0;
        }
        .proj-card::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(145deg, rgba(255,255,255,0.028), rgba(15,23,42,0.26));
          opacity: 0.5;
          pointer-events: none;
          z-index: 0;
        }
        .proj-card > * {
          position: relative;
          z-index: 1;
        }
        .proj-card:hover {
          background: rgba(26,115,232,0.07);
          border-color: rgba(26,115,232,0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 0 transparent;
        }
        .proj-card:hover::before {
          opacity: 0.2;
        }
        .proj-card:hover .proj-arrow { color: #60a5fa; transform: translate(2px,-2px); }
        .proj-card:hover .proj-name  { color: #93c5fd; }

        .proj-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: linear-gradient(135deg, rgba(26,115,232,0.2), rgba(26,115,232,0.08));
          border: 1px solid rgba(26,115,232,0.25);
          color: #60a5fa;
        }

        .proj-arrow {
          color: rgba(255,255,255,0.2);
          transition: color 0.2s, transform 0.2s;
          flex-shrink: 0;
        }

        .ps-new-btn {
          background: linear-gradient(135deg, #1A73E8, #3b82f6);
          border: 1px solid rgba(96,165,250,0.4);
          border-radius: 10px;
          padding: 9px 18px;
          color: #fff;
          font-weight: 600;
          font-size: 13.5px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: filter 0.18s, transform 0.18s, box-shadow 0.18s;
          flex-shrink: 0;
          box-shadow: 0 1px 0 rgba(255,255,255,0.1) inset, 0 4px 12px rgba(26,115,232,0.3);
        }
        .ps-new-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.1) inset, 0 6px 20px rgba(26,115,232,0.4);
        }

        .badge-verified {
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.03em;
          border: 1px solid rgba(34,197,94,0.4);
          color: #86efac;
          background: rgba(22,163,74,0.15);
          flex-shrink: 0;
        }
        .badge-unverified {
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.03em;
          border: 1px solid rgba(245,158,11,0.4);
          color: #fcd34d;
          background: rgba(217,119,6,0.12);
          flex-shrink: 0;
        }

        .verify-link {
          font-size: 11.5px;
          font-weight: 500;
          color: #fbbf24;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          opacity: 0.85;
          transition: opacity 0.15s;
        }
        .verify-link:hover { opacity: 1; }

        .empty-box {
          border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 18px;
          padding: 72px 24px;
          text-align: center;
        }

        .load-more-btn {
          background: rgba(26,115,232,0.1);
          border: 1px solid rgba(26,115,232,0.3);
          border-radius: 10px;
          padding: 9px 24px;
          color: #93c5fd;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.18s, border-color 0.18s;
        }
        .load-more-btn:hover { background: rgba(26,115,232,0.18); border-color: rgba(26,115,232,0.5); }
        .load-more-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="ps-anim ps-anim-1 flex items-start justify-between gap-4 mb-8">
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
              Workspace
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              {welcomeName ? `Welcome back, ${welcomeName}` : 'Your Projects'}
            </h1>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
              Manage your Server-Driven UI projects
            </p>
          </div>
          <button className="ps-new-btn" onClick={() => setIsModalOpen(true)}>
            <IconPlus />
            New Project
          </button>
        </div>

        {/* Stats row */}
        <div className="ps-anim ps-anim-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          <div className="stat-card stat-card-primary">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em' }}>Total Projects</span>
              <span style={{ color: '#60a5fa', opacity: 0.7 }}><IconBox /></span>
            </div>
            <p style={{ fontSize: 32, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {validApps.length}
            </p>
          </div>
          <div className="stat-card stat-card-green">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em' }}>Verified</span>
              <span style={{ color: '#4ade80', opacity: 0.7 }}><IconShield /></span>
            </div>
            <p style={{ fontSize: 32, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {verifiedCount}
            </p>
          </div>
          <div className="stat-card stat-card-secondary">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em' }}>Last Activity</span>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}><IconClock /></span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {lastActivity}
            </p>
          </div>
        </div>

        {/* Search + filters */}
        <div className="ps-anim ps-anim-3" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 360 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.28)', pointerEvents: 'none', display: 'flex' }}>
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-search"
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: `All  ${validApps.length}` },
              { key: 'verified', label: `Verified  ${verifiedCount}` },
              { key: 'unverified', label: `Unverified  ${unverifiedCount}` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`filter-tab ${filter === key ? 'active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>

          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#fca5a5', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Content */}
        <div className="ps-anim ps-anim-4">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
              <div style={{ width: 32, height: 32, border: '2px solid rgba(26,115,232,0.2)', borderTopColor: '#1A73E8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Loading projects…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-box">
              <div style={{ color: 'rgba(255,255,255,0.12)', marginBottom: 16 }}>
                <IconFolderX />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
                {search ? 'No matches found' : filter !== 'all' ? `No ${filter} projects` : 'No projects yet'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, marginBottom: search || filter !== 'all' ? 0 : 20 }}>
                {search
                  ? 'Try a different search term'
                  : filter !== 'all'
                    ? 'Change the filter to see other projects'
                    : 'Create your first project to get started'}
              </p>
              {!search && filter === 'all' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{ background: 'rgba(26,115,232,0.15)', border: '1px solid rgba(26,115,232,0.35)', borderRadius: 10, padding: '9px 20px', color: '#93c5fd', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  + Create your first project
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {filtered.map((app) => {
                const appRef = app.appId || app.id || app.packageName || app.bundleId
                const isDisplaced = app.bundleIdStatus === 'displaced'
                const isVerified = Boolean(app.domainVerified)

                return (
                  <Link
                    key={app.bundleId || app.packageName || app.id || app._id}
                    to={`/projects/${appRef}`}
                    className="proj-card"
                  >
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div className="proj-icon">
                          <IconBox />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p className="proj-name" style={{ fontWeight: 600, fontSize: 14.5, color: '#f1f5f9', transition: 'color 0.2s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {app.appName}
                          </p>
                          <p style={{ fontSize: 11.5, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {app.packageName || '—'}
                          </p>
                        </div>
                      </div>
                      <span className="proj-arrow">
                        <IconArrow />
                      </span>
                    </div>

                    {/* Card footer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {isDisplaced ? (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fca5a5', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 999, padding: '3px 9px' }}>
                            Displaced
                          </span>
                        ) : isVerified ? (
                          <span className="badge-verified">Verified</span>
                        ) : (
                          <span className="badge-unverified">Unverified</span>
                        )}

                        {!isVerified && !isDisplaced && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              navigate(`/apps/${encodeURIComponent(appRef)}/verify`)
                            }}
                            className="verify-link"
                          >
                            Verify →
                          </button>
                        )}
                      </div>

                      <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.28)', whiteSpace: 'nowrap' }}>
                        {timeAgo(app.updatedAt || app.createdAt)}
                      </span>
                    </div>

                    {isDisplaced && (
                      <p style={{ fontSize: 11, color: '#fca5a5', marginTop: -8 }}>
                        BundleId claimed by another developer. Update in settings.
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          )}

          {nextToken && validApps.length > 0 && !loading && (
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="load-more-btn"
              >
                {loadingMore ? 'Loading…' : 'Load more projects'}
              </button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <CreateAppModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchApps}
        />
      )}
    </>
  )
}
