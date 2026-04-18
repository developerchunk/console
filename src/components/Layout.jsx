import { useEffect, useState } from 'react'
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getDisplayUsername } from '../services/userDisplay'

const PROFILE_COMPLETE_KEY = 'ketoy_profile_complete'
const PROFILE_STATUS_KEY = 'ketoy_profile_status'

export default function Layout() {
  const { developer, logout } = useAuthStore()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [profileStatus, setProfileStatus] = useState(localStorage.getItem(PROFILE_STATUS_KEY) || 'unknown')
  const navigate = useNavigate()
  const location = useLocation()
  const displayName = String(getDisplayUsername(developer) || 'Developer').trim()
  const profileInitial = (displayName || 'U').trim().charAt(0).toUpperCase()
  const canGoBack = location.pathname !== '/projects'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/projects')
  }

  const navItemClass = ({ isActive }) => `
    sidebar-aura-pill flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border
    ${isActive
      ? 'sidebar-aura-pill-active text-white border-[#1A73E8]/55'
      : 'text-gray-400 hover:text-white border-transparent'}
  `

  useEffect(() => {
    const handleProfileChange = (event) => {
      const detail = event?.detail
      const status = typeof detail === 'object' && detail?.status
        ? detail.status
        : (Boolean(detail) ? 'complete' : 'incomplete')
      setProfileStatus(status)
    }

    window.addEventListener('ketoy-profile-complete-changed', handleProfileChange)
    return () => window.removeEventListener('ketoy-profile-complete-changed', handleProfileChange)
  }, [])

  return (
    <div className="h-screen overflow-hidden bg-[#070b12] text-white">
      <style>{`
        @keyframes sidebarAuraDrift {
          0% { transform: translate3d(-26%, -24%, 0) rotate(0deg); }
          50% { transform: translate3d(8%, 14%, 0) rotate(180deg); }
          100% { transform: translate3d(-26%, -24%, 0) rotate(360deg); }
        }

        .sidebar-aura-pill {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          background: rgba(255, 255, 255, 0.012);
        }

        .sidebar-aura-pill::before {
          content: '';
          position: absolute;
          left: -44%;
          top: -58%;
          width: 175%;
          height: 175%;
          border-radius: 42%;
          background: radial-gradient(circle at 32% 30%, rgba(96,165,250,0.2), rgba(59,130,246,0.08) 35%, rgba(59,130,246,0) 64%);
          filter: blur(15px);
          animation: sidebarAuraDrift 17s linear infinite;
          opacity: 0.1;
          pointer-events: none;
          z-index: 0;
        }

        .sidebar-aura-pill::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(145deg, rgba(255,255,255,0.026), rgba(15,23,42,0.24));
          opacity: 0.52;
          pointer-events: none;
          z-index: 0;
        }

        .sidebar-aura-pill > * {
          position: relative;
          z-index: 1;
        }

        .sidebar-aura-pill:hover {
          background: rgba(255, 255, 255, 0.045);
        }

        .sidebar-aura-pill:hover::before {
          opacity: 0.15;
        }

        .sidebar-aura-pill-active {
          background: rgba(11, 35, 64, 0.7);
          box-shadow: inset 0 0 0 1px rgba(26, 115, 232, 0.2);
        }

        .sidebar-aura-pill-active::before {
          opacity: 0.2;
        }

        .sidebar-aura-card {
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }

        .sidebar-aura-card::before {
          content: '';
          position: absolute;
          left: -40%;
          top: -56%;
          width: 170%;
          height: 170%;
          border-radius: 40%;
          background: radial-gradient(circle at 30% 32%, rgba(96,165,250,0.16), rgba(59,130,246,0.06) 36%, rgba(59,130,246,0) 65%);
          filter: blur(14px);
          animation: sidebarAuraDrift 18s linear infinite;
          opacity: 0.1;
          pointer-events: none;
          z-index: 0;
        }

        .sidebar-aura-card::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(145deg, rgba(255,255,255,0.022), rgba(15,23,42,0.24));
          pointer-events: none;
          z-index: 0;
        }

        .sidebar-aura-card > * {
          position: relative;
          z-index: 1;
        }
      `}</style>

      <div className="flex h-full">
        <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 sticky top-0 h-screen overflow-y-auto flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(26,115,232,0.14),rgba(26,115,232,0)_24%),#040507]">
          <div className="relative z-10 flex min-h-full flex-col">
          <div className="px-5 h-16 border-b border-white/10 flex items-center">
            <Link to="/projects" className="flex items-center gap-3">
              <img
                src="/T_ketoy_logo.png"
                alt="Ketoy Logo"
                className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/20"
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold tracking-wide">Ketoy Console</p>
                </div>
                <p className="text-xs text-gray-400">Server-Driven UI Studio</p>
              </div>
            </Link>
          </div>

          <nav className="px-4 py-5 space-y-2">
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.12em] text-gray-500">MAIN</p>
            <NavLink to="/projects" className={navItemClass}>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 3v4M16 3v4" />
              </svg>
              <span>Projects</span>
            </NavLink>
            <NavLink to="/profile" className={navItemClass}>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M4 19a8 8 0 0116 0" />
              </svg>
              <span>Profile</span>
            </NavLink>

            <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.12em] text-gray-500">SUPPORT</p>
              <a
                href="https://docs.ketoy.dev"
                target="_blank"
                rel="noreferrer"
                className="sidebar-aura-pill flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-all duration-200 border border-transparent"
              >
                <span className="inline-flex items-center gap-3">
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 8h8M8 12h8M8 16h5" />
                  </svg>
                  <span>Documentation</span>
                </span>
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M14 5h5m0 0v5m0-5L10 14" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M5 9v10h10" />
                </svg>
              </a>

              <NavLink to="/contact" className={navItemClass}>
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8" />
                  <rect x="3" y="6" width="18" height="12" rx="2" ry="2" strokeWidth={1.7} />
                </svg>
                <span>Contact Us</span>
              </NavLink>
            </div>
          </nav>

          <div className="mt-auto p-4">
            <div className="sidebar-aura-card rounded-2xl px-3 py-3 border border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#0b0f14] text-sm font-semibold text-white ring-1 ring-white/20">
                  {profileInitial}
                  {profileStatus === 'incomplete' && (
                    <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-[#040507]" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-100 truncate">{displayName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/[0.06]"
              >
                Logout
              </button>
            </div>
          </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 h-full overflow-y-auto">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d1624]/90 backdrop-blur supports-[backdrop-filter]:bg-[#0d1624]/80">
            <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {canGoBack && (
                  <button
                    onClick={handleGoBack}
                    className="btn-ketoy btn-ketoy-secondary !w-9 !h-9 !p-0 inline-flex items-center justify-center rounded-xl"
                    title="Go back"
                    aria-label="Go back"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <Link to="/projects" className="md:hidden flex items-center gap-2">
                  <img
                    src="/T_ketoy_logo.png"
                    alt="Ketoy Logo"
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <span className="text-base font-semibold">Ketoy</span>
                </Link>
              </div>

              <div className="hidden sm:flex items-center h-full text-xs uppercase tracking-[0.12em] text-gray-500">
                Workspace
              </div>
            </div>
          </header>

          <main>
            {profileStatus === 'incomplete' && (
              <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Complete your profile to start using Ketoy.{' '}
                <Link to="/profile" className="underline text-amber-200 hover:text-amber-100">Go to profile</Link>
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111b2b] rounded-2xl max-w-md w-full p-6 border border-white/15 shadow-2xl shadow-black/40">
            <h2 className="text-xl font-bold text-white mb-4">Log out?</h2>
            <p className="text-gray-300 mb-6">Are you sure you want to log out of this session?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="btn-ketoy btn-ketoy-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="btn-ketoy btn-ketoy-danger flex-1"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
