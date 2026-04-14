import { useEffect, useRef, useState } from 'react'
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getDisplayUsername } from '../services/userDisplay'

const PROFILE_COMPLETE_KEY = 'ketoy_profile_complete'
const PROFILE_STATUS_KEY = 'ketoy_profile_status'

export default function Layout() {
  const { developer, logout } = useAuthStore()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [profileStatus, setProfileStatus] = useState(localStorage.getItem(PROFILE_STATUS_KEY) || 'unknown')
  const accountMenuRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const displayName = getDisplayUsername(developer)
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
    flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
    ${isActive
      ? 'bg-[#1A73E8]/20 text-white border border-[#1A73E8]/40'
      : 'text-gray-300 hover:text-white hover:bg-white/[0.06] border border-transparent'}
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

  useEffect(() => {
    if (!showAccountMenu) return undefined

    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') setShowAccountMenu(false)
    }

    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [showAccountMenu])

  return (
    <div className="h-screen overflow-hidden bg-[#070b12] text-white">
      <div className="flex h-full">
        <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 sticky top-0 h-screen overflow-y-auto flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(26,115,232,0.12),rgba(7,11,18,0)_24%),#0b1320]">
          <div className="px-5 pt-6 pb-4 border-b border-white/10">
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
            <NavLink to="/projects" className={navItemClass}>
              <span>Projects</span>
            </NavLink>
          </nav>

          <div className="mt-auto p-4">
            <div className="ketoy-card-surface-soft rounded-2xl px-4 py-3">
              <div className="ketoy-card-content">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Signed in as</p>
                <p className="mt-2 text-sm font-medium text-gray-100 truncate">{displayName}</p>
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

              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setShowAccountMenu((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-2 py-1.5 hover:bg-white/[0.08] transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={showAccountMenu}
                  aria-label="Account menu"
                >
                  <span className="hidden sm:block text-gray-200 text-sm max-w-[140px] truncate">{displayName}</span>
                  <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1A73E8]/30 text-sm font-semibold text-white ring-1 ring-white/20">
                    {profileInitial}
                    {profileStatus === 'incomplete' && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-[#0d1624]" aria-hidden="true" />
                    )}
                  </span>
                </button>

                {showAccountMenu && (
                  <div className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-xl border border-white/15 bg-[#0f1a2a] shadow-2xl shadow-black/40" role="menu">
                    <div className="border-b border-white/10 px-4 py-3">
                      <p className="text-sm font-medium text-white truncate">{displayName}</p>
                      <p className="text-xs text-gray-400">Account</p>
                    </div>
                    <div className="p-1.5">
                      <Link
                        to="/profile"
                        onClick={() => setShowAccountMenu(false)}
                        className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
                        role="menuitem"
                      >
                        Profile
                      </Link>
                      <a
                        href="https://docs.ketoy.dev/"
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setShowAccountMenu(false)}
                        className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
                        role="menuitem"
                      >
                        Docs
                      </a>
                      <button
                        onClick={() => {
                          setShowAccountMenu(false)
                          setShowLogoutConfirm(true)
                        }}
                        className="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/15"
                        role="menuitem"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
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
