export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <p className="text-xs uppercase tracking-[0.18em] text-blue-200/70">Support</p>
      <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white">Contact the Ketoy Team</h1>

      <p className="mt-4 text-sm sm:text-base text-gray-300 leading-relaxed max-w-3xl">
        We are always here to help you. Please contact us for any query: help, issues, support,
        pricing, getting Ketoy for enterprise, or anything else.
      </p>

      <div className="mt-8 grid gap-4">
        <a
          href="https://calendar.app.google/U8oLuX3kXpps55vYA"
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 hover:bg-blue-500/15 transition-colors"
        >
          <p className="text-xs uppercase tracking-[0.12em] text-blue-200/70">Schedule</p>
          <p className="mt-1 text-lg font-semibold text-blue-100">Schedule a 30 min call with Team</p>
        </a>

        <a
          href="mailto:support@ketoy.dev"
          className="block rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 hover:bg-emerald-500/15 transition-colors"
        >
          <p className="text-xs uppercase tracking-[0.12em] text-emerald-200/70">Email</p>
          <p className="mt-1 text-lg font-semibold text-emerald-100">Email us: support@ketoy.dev</p>
          <p className="mt-2 text-xs sm:text-sm text-emerald-100/80">
            Once you mail us, our team will connect with you within 24 business/non-business hours.
          </p>
        </a>
      </div>
    </div>
  )
}
