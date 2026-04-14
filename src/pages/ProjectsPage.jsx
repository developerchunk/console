import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { appAPI } from '../services/api'
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

const StatCard = ({ icon, label, value, accent }) => (
  <div
    style={{
      background: accent
        ? 'linear-gradient(135deg, rgba(26,115,232,0.12), rgba(26,115,232,0.04))'
        : 'rgba(255,255,255,0.03)',
      border: accent ? '1px solid rgba(26,115,232,0.25)' : '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '18px 20px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: accent
            ? 'linear-gradient(135deg, #1A73E8, #42A5F5)'
            : 'rgba(255,255,255,0.06)',
        }}
      >
        <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: accent ? '#fff' : '#42A5F5' }}>
          {icon}
        </span>
      </div>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em' }}>{label}</span>
    </div>
    <p style={{ fontSize: 26, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>{value}</p>
  </div>
)

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { apps, setApps, setLoading, loading, error, setError } = useAppStore()
  const { developer } = useAuthStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [nextToken, setNextToken] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchApps()
  }, [])

  const fetchApps = async ({ append = false, token = null } = {}) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await appAPI.getAll(token ? { nextToken: token } : {})
      const payload = response.data?.data
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : []
      const incomingApps = Array.isArray(items) ? items : []

      if (append) {
        setApps([...apps, ...incomingApps])
      } else {
        setApps(incomingApps)
      }

      setNextToken(Array.isArray(payload) ? null : payload?.nextToken || null)
      setError(null)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch apps')
    } finally {
      if (append) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
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

  const filtered = sortedApps
    .filter((app) => app && (app.appName || app.packageName || app.bundleId || app.appId || app.id))
    .filter(
    (a) =>
      (a.appName || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.packageName || '').toLowerCase().includes(search.toLowerCase())
  )

  const displayName = developer?.username || developer?.email?.split('@')[0] || null
  const lastActivity = sortedApps.length > 0 ? timeAgo(sortedApps[0].updatedAt || sortedApps[0].createdAt) : '—'

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .ps-fade { animation: fadeSlideUp 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .ps-fade-1 { animation-delay: 0ms; }
        .ps-fade-2 { animation-delay: 60ms; }
        .ps-fade-3 { animation-delay: 110ms; }
        .ps-fade-4 { animation-delay: 150ms; }

        .project-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          text-decoration: none;
          transition: border-color 0.18s, background 0.18s;
        }
        .project-card:hover {
          background: rgba(26,115,232,0.06);
          border-color: rgba(26,115,232,0.28);
        }
        .project-card:hover .pc-arrow { color: #42A5F5; }
        .project-card:hover .pc-name  { color: #42A5F5; }

        .ps-search {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 9px 14px 9px 38px;
          color: #fff;
          font-size: 13px;
          outline: none;
          width: 280px;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .ps-search::placeholder { color: rgba(255,255,255,0.3); }
        .ps-search:focus {
          border-color: rgba(26,115,232,0.5);
          box-shadow: 0 0 0 3px rgba(26,115,232,0.1);
        }

        .ps-new-btn {
          background: linear-gradient(135deg, #1A73E8, #42A5F5);
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          transition: filter 0.18s, transform 0.18s;
          flex-shrink: 0;
        }
        .ps-new-btn:hover {
          filter: brightness(1.12);
          transform: translateY(-1px);
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome header */}
        <div className="ps-fade ps-fade-1" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 12, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 6 }}>
              Workspace
            </p>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              Welcome back{displayName ? `, ${displayName}` : ''}
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6, marginBottom: 0 }}>
              Here's an overview of your projects
            </p>
          </div>
          <button className="ps-new-btn" onClick={() => setIsModalOpen(true)}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Project
          </button>
        </div>

        {/* Stats */}
        <div
          className="ps-fade ps-fade-2"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}
        >
          <StatCard
            label="Total Projects"
            value={apps.length}
            accent
            icon={(
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          />
          <StatCard
            label="Last Activity"
            value={lastActivity}
            icon={(
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          />
        </div>

        {/* Search + count */}
        <div className="ps-fade ps-fade-3" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ position: 'relative' }}>
            <svg
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-search"
            />
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Content */}
        <div className="ps-fade ps-fade-4">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 14 }}>
              <div style={{ width: 28, height: 28, border: '3px solid rgba(26,115,232,0.2)', borderTopColor: '#1A73E8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>Loading projects…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 14 }}>
              <svg style={{ width: 44, height: 44, margin: '0 auto 12px', color: 'rgba(255,255,255,0.18)', display: 'block' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: '0 0 4px' }}>
                {search ? 'No matches found' : 'No projects yet'}
              </p>
              {!search && (
                <>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, margin: '0 0 16px' }}>
                    Create your first project to get started
                  </p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    style={{ background: 'none', border: 'none', color: '#42A5F5', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                  >
                    + Create your first project
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {filtered.map((app) => (
                (() => {
                  const appRef = app.appId || app.id || app.packageName || app.bundleId
                  const isDisplaced = app.bundleIdStatus === 'displaced'
                  const isVerified = Boolean(app.domainVerified)

                  return (
                <Link
                  key={app.bundleId || app.packageName || app.id || app._id}
                  to={`/projects/${appRef}`}
                  className="project-card"
                >
                  {/* Left: icon + names */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: 'rgba(26,115,232,0.1)',
                      border: '1px solid rgba(26,115,232,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <svg style={{ width: 18, height: 18, color: '#42A5F5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <p className="pc-name" style={{ margin: 0, fontWeight: 500, fontSize: 14, color: '#fff', transition: 'color 0.15s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {app.appName}
                        </p>
                        <span style={{
                          flexShrink: 0,
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 700,
                          border: isVerified ? '1px solid rgba(34,197,94,0.45)' : '1px solid rgba(245,158,11,0.45)',
                          color: isVerified ? '#86efac' : '#fcd34d',
                          background: isVerified ? 'rgba(22,163,74,0.15)' : 'rgba(217,119,6,0.14)'
                        }}>
                          {isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.packageName || '—'}
                      </p>
                      {isDisplaced && (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#fca5a5', border: '1px solid rgba(239,68,68,0.45)', background: 'rgba(239,68,68,0.12)', borderRadius: 8, padding: '5px 8px' }}>
                          Your bundleId was claimed by another developer. Update it in app settings.
                        </div>
                      )}
                      {!isVerified && !isDisplaced && (
                        <div style={{ marginTop: 6 }}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              navigate(`/apps/${encodeURIComponent(appRef)}/verify`)
                            }}
                            className="text-xs text-amber-300 hover:text-amber-200 underline bg-transparent border-none p-0"
                          >
                            Verify Domain
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: time + arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                      {timeAgo(app.updatedAt || app.createdAt)}
                    </span>
                    <svg className="pc-arrow" style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.2)', transition: 'color 0.15s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" />
                    </svg>
                  </div>
                </Link>
                  )
                })()
              ))}
            </div>
          )}

          {/* Load more */}
          {nextToken && apps.length > 0 && !loading && (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  background: 'rgba(26,115,232,0.1)',
                  border: '1px solid rgba(26,115,232,0.3)',
                  borderRadius: 8,
                  padding: '8px 20px',
                  color: '#42A5F5',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                  opacity: loadingMore ? 0.5 : 1,
                }}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
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
