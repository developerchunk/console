import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { profileAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'

export default function ProfileGuard({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { updateDeveloper } = useAuthStore((state) => ({
    updateDeveloper: state.updateDeveloper
  }))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const response = await profileAPI.getMyProfile()
        const data = response.data?.data || response.data || {}

        if (data.username) {
          updateDeveloper(data)
          if (location.pathname === '/profile/setup') {
            navigate('/apps', { replace: true })
          }
        } else if (location.pathname !== '/profile/setup') {
          navigate('/profile/setup', { replace: true })
        }
      } catch (err) {
        if (err?.response?.status === 404) {
          if (location.pathname !== '/profile/setup') {
            navigate('/profile/setup', { replace: true })
          }
        }
      } finally {
        setLoading(false)
      }
    }

    checkProfile()
  }, [location.pathname, navigate, updateDeveloper])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b12] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-gray-400 text-sm">Checking profile...</p>
        </div>
      </div>
    )
  }

  return children
}