import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getDisplayUsername } from '../services/userDisplay'

const actionCards = [
  {
    title: 'Create a Project',
    description: 'Start a new app and generate your API key for mobile integration.',
    to: '/projects',
    cta: 'Go to Projects'
  },
  {
    title: 'Manage Existing Projects',
    description: 'Open your current projects, review screens, and publish updates.',
    to: '/projects',
    cta: 'View Projects'
  },
  {
    title: 'API Key & Docs',
    description: 'View your app API keys and read integration docs for the Android SDK.',
    href: 'https://docs.ketoy.dev',
    cta: 'View Docs'
  }
]

export default function HomePage() {
  const { developer } = useAuthStore()
  const displayName = getDisplayUsername(developer)
  const welcomeName = String(displayName || '').split('@')[0] || 'Developer'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(115deg,rgba(26,115,232,0.28),rgba(26,115,232,0.08)_42%,rgba(12,22,38,0.9))] p-6 sm:p-8">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-blue-100/80">Home</p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white">Welcome back, {welcomeName}</h1>
            <p className="mt-2 text-blue-100/80 max-w-2xl">
              Build, preview, and ship SDUI screens with a faster workflow and clearer project visibility.
            </p>
          </div>
          <Link
            to="/projects"
            className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 bg-[#1A73E8] hover:bg-[#1765cc] text-white text-sm font-medium transition-colors shadow-lg shadow-blue-900/40"
          >
            Open Projects
          </Link>
        </div>
        <div className="pointer-events-none absolute -top-14 -right-14 w-56 h-56 rounded-full bg-[#1A73E8]/30 blur-3xl"></div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="ketoy-card-surface rounded-2xl p-5">
          <div className="ketoy-card-content">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Active Projects</p>
            <p className="mt-3 text-3xl font-semibold text-white">Your Workspace</p>
            <p className="mt-2 text-sm text-gray-400">Track app metadata, screen definitions, and release status from one place.</p>
          </div>
        </div>
        <div className="ketoy-card-surface rounded-2xl p-5">
          <div className="ketoy-card-content">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Android SDK</p>
            <p className="mt-3 text-3xl font-semibold text-white">Integration Ready</p>
            <p className="mt-2 text-sm text-gray-400">Review payload shapes and implementation notes before shipping updates.</p>
          </div>
        </div>
        <div className="ketoy-card-surface rounded-2xl p-5">
          <div className="ketoy-card-content">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">System Uptime</p>
            <p className="mt-3 text-3xl font-semibold text-white">99.9%</p>
            <p className="mt-2 text-sm text-gray-400">Console surfaces are tuned for stable editing and fast iteration cycles.</p>
          </div>
        </div>
      </section>

      <div>
        <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actionCards.map((card) => (
            <div key={card.title} className="ketoy-card-surface-soft rounded-2xl p-5 hover:bg-[#13243a] transition-colors duration-200">
              <div className="ketoy-card-content">
                <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                <p className="mt-2 text-sm text-gray-400 min-h-[56px]">{card.description}</p>
                {card.href ? (
                  <a
                    href={card.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2 bg-[#1A73E8] hover:bg-[#1765cc] text-white text-sm font-medium transition-colors"
                  >
                    {card.cta}
                  </a>
                ) : (
                  <Link
                    to={card.to}
                    className="mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2 bg-[#1A73E8] hover:bg-[#1765cc] text-white text-sm font-medium transition-colors"
                  >
                    {card.cta}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}