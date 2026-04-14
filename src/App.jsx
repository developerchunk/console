import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AuthPage from './pages/AuthPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import ScreenEditorPage from './pages/ScreenEditorPage'
import BundleSnapshotsPage from './pages/BundleSnapshotsPage'
import ProfileSetupPage from './pages/ProfileSetupPage'
import NamespaceVerificationWizardPage from './pages/NamespaceVerificationWizardPage'
import ProfilePage from './pages/ProfilePage'
import Layout from './components/Layout'
import { getProfile } from './api'

const PROFILE_COMPLETE_KEY = 'ketoy_profile_complete'
const PROFILE_STATUS_KEY = 'ketoy_profile_status'
const PROFILE_DISPLAY_NAME_KEY = 'ketoy_profile_display_name'

function AuthenticatedShell() {
  const location = useLocation()
  const [checkingProfile, setCheckingProfile] = useState(true)
  const [profileStatus, setProfileStatus] = useState(localStorage.getItem(PROFILE_STATUS_KEY) || 'unknown')

  useEffect(() => {
    let mounted = true

    const syncProfile = async () => {
      try {
        const response = await getProfile()
        const payload = response?.data?.data || response?.data || {}
        const data = payload?.profile || payload?.developer || payload
        const hasUsername = Boolean(data?.username)
        const profileDisplayName = String(data?.name || data?.displayName || '').trim()
        const complete = typeof data?.complete === 'boolean'
          ? Boolean(data.complete && hasUsername)
          : hasUsername
        if (!mounted) return
        if (profileDisplayName) {
          localStorage.setItem(PROFILE_DISPLAY_NAME_KEY, profileDisplayName)
        } else {
          localStorage.removeItem(PROFILE_DISPLAY_NAME_KEY)
        }
        const { developer, updateDeveloper } = useAuthStore.getState()
        updateDeveloper({
          ...(developer || {}),
          ...data,
          displayName: profileDisplayName || developer?.displayName || ''
        })
        localStorage.setItem(PROFILE_COMPLETE_KEY, complete ? 'true' : 'false')
        const nextStatus = complete ? 'complete' : 'incomplete'
        localStorage.setItem(PROFILE_STATUS_KEY, nextStatus)
        setProfileStatus(nextStatus)
      } catch (err) {
        if (!mounted) return
        const incomplete = err?.response?.status === 404 || err?.response?.data?.error?.code === 'PROFILE_INCOMPLETE'
        if (incomplete) {
          localStorage.setItem(PROFILE_COMPLETE_KEY, 'false')
          localStorage.setItem(PROFILE_STATUS_KEY, 'incomplete')
          setProfileStatus('incomplete')
        } else {
          localStorage.setItem(PROFILE_STATUS_KEY, 'unknown')
          setProfileStatus('unknown')
        }
      } finally {
        if (mounted) setCheckingProfile(false)
      }
    }

    syncProfile()

    const handleProfileChange = (event) => {
      const detail = event?.detail
      const status = typeof detail === 'object' && detail?.status
        ? detail.status
        : (Boolean(detail) ? 'complete' : 'incomplete')
      localStorage.setItem(PROFILE_COMPLETE_KEY, status === 'complete' ? 'true' : 'false')
      localStorage.setItem(PROFILE_STATUS_KEY, status)
      setProfileStatus(status)
    }

    window.addEventListener('ketoy-profile-complete-changed', handleProfileChange)
    return () => {
      mounted = false
      window.removeEventListener('ketoy-profile-complete-changed', handleProfileChange)
    }
  }, [])

  if (checkingProfile) {
    return (
      <div className="min-h-screen bg-[#070b12] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-gray-400 text-sm">Checking profile...</p>
        </div>
      </div>
    )
  }

  if (profileStatus === 'incomplete' && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />
  }

  return <Layout />
}

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <AuthPage /> : <Navigate to="/" />} />
        <Route path="/auth" element={<Navigate to="/login" replace />} />
        <Route
          path="/profile/setup"
          element={
            isAuthenticated ? (
              <ProfileSetupPage />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <AuthenticatedShell />
            ) : (
              <Navigate to="/login" />
            )
          }
        >
          <Route index element={<Navigate to="/apps" replace />} />
          <Route path="apps" element={<ProjectsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="apps/:appId/verify" element={<NamespaceVerificationWizardPage />} />
          <Route path="api-keys" element={<Navigate to="/projects" replace />} />
          <Route path="projects/:packageName" element={<ProjectDetailPage />} />
          <Route path="projects/:packageName/screens/:screenName" element={<ScreenEditorPage />} />
          <Route path="projects/:packageName/bundles" element={<BundleSnapshotsPage />} />
          <Route path="apps/:packageName/bundles" element={<BundleSnapshotsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App
