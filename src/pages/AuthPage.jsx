import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const COGNITO_REGION = import.meta.env.VITE_COGNITO_REGION || 'ap-south-1'
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '77c5oeofluou2n5htlk6gec0p7'
const COGNITO_ENDPOINT = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(base64)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export default function AuthPage() {
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const { developerToken, setAuth } = useAuthStore((state) => ({
    developerToken: state.developerToken,
    setAuth: state.setAuth
  }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [authMode, setAuthMode] = useState('signin')
  const [isNewPasswordRequired, setIsNewPasswordRequired] = useState(false)
  const [challengeSession, setChallengeSession] = useState('')
  const [refreshTokenInMemory, setRefreshTokenInMemory] = useState(null)
  const [rememberMe, setRememberMe] = useState(true)
  const [signupStep, setSignupStep] = useState('signup')
  const [signupMessage, setSignupMessage] = useState('')
  const [slideDirection, setSlideDirection] = useState('right')
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    newPassword: ''
  })
  const [signupData, setSignupData] = useState({
    password: '',
    confirmationCode: ''
  })

  useEffect(() => {
    if (developerToken) {
      navigate('/', { replace: true })
    }
  }, [developerToken, navigate])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId
    let time = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      time += 0.003
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const spacing = 48
      const cols = Math.ceil(canvas.width / spacing) + 1
      const rows = Math.ceil(canvas.height / spacing) + 1

      // Grid lines
      ctx.strokeStyle = 'hsla(225, 10%, 20%, 0.3)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < cols; i++) {
        ctx.beginPath()
        ctx.moveTo(i * spacing, 0)
        ctx.lineTo(i * spacing, canvas.height)
        ctx.stroke()
      }
      for (let j = 0; j < rows; j++) {
        ctx.beginPath()
        ctx.moveTo(0, j * spacing)
        ctx.lineTo(canvas.width, j * spacing)
        ctx.stroke()
      }

      // Animated glow dots at intersections
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing
          const y = j * spacing
          const wave = Math.sin(time * 2 + i * 0.3 + j * 0.5) * 0.5 + 0.5
          const dist = Math.sqrt(
            Math.pow((x - canvas.width / 2) / canvas.width, 2) +
            Math.pow((y - canvas.height / 2) / canvas.height, 2)
          )
          const falloff = Math.max(0, 1 - dist * 2.2)
          const alpha = wave * falloff * 1.2

          if (alpha > 0.05) {
            const radius = 1.8 + wave * falloff * 2.2
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 5)
            gradient.addColorStop(0, `hsla(199, 89%, 65%, ${alpha})`)
            gradient.addColorStop(0.5, `hsla(199, 89%, 48%, ${alpha * 0.5})`)
            gradient.addColorStop(1, `hsla(199, 89%, 48%, 0)`)
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(x, y, radius * 5, 0, Math.PI * 2)
            ctx.fill()

            ctx.fillStyle = `hsla(199, 89%, 75%, ${Math.min(alpha * 1.5, 1)})`
            ctx.beginPath()
            ctx.arc(x, y, radius, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      // Floating gradient orbs
      for (let k = 0; k < 3; k++) {
        const ox = canvas.width * (0.3 + 0.4 * Math.sin(time * 0.5 + k * 2.1))
        const oy = canvas.height * (0.3 + 0.4 * Math.cos(time * 0.4 + k * 1.7))
        const orbGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, 180)
        orbGrad.addColorStop(0, `hsla(${199 + k * 18}, 80%, 50%, 0.04)`)
        orbGrad.addColorStop(1, `hsla(${199 + k * 18}, 80%, 50%, 0)`)
        ctx.fillStyle = orbGrad
        ctx.beginPath()
        ctx.arc(ox, oy, 180, 0, Math.PI * 2)
        ctx.fill()
      }

      animationId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const getCognitoErrorMessage = (responseBody) => {
    if (!responseBody) return 'Authentication failed'
    const message = responseBody.message || responseBody.Message
    if (message) return message

    if (responseBody.__type) {
      return String(responseBody.__type).split('#').pop() || 'Authentication failed'
    }

    return 'Authentication failed'
  }

  const finalizeSession = ({ idToken, refreshToken, username }) => {
    const claims = decodeJwtPayload(idToken) || {}
    const cognitoDeveloper = {
      ...claims,
      email: claims.email,
      username,
      sub: claims.sub
    }

    setAuth(cognitoDeveloper, idToken, username)
    if (refreshToken) {
      setRefreshTokenInMemory(refreshToken)
    }

    navigate('/', { replace: true })
  }

  const handlePasswordSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!COGNITO_CLIENT_ID) {
      setError('Missing VITE_COGNITO_CLIENT_ID in environment configuration.')
      setLoading(false)
      return
    }

    try {
      const username = formData.username.trim()
      const response = await fetch(COGNITO_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
        },
        body: JSON.stringify({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: COGNITO_CLIENT_ID,
          AuthParameters: {
            USERNAME: username,
            PASSWORD: formData.password
          }
        })
      })

      const body = await response.json()
      if (!response.ok) {
        throw new Error(getCognitoErrorMessage(body))
      }

      if (body.AuthenticationResult?.IdToken) {
        finalizeSession({
          idToken: body.AuthenticationResult.IdToken,
          refreshToken: body.AuthenticationResult.RefreshToken,
          username
        })
        return
      }

      if (body.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        setChallengeSession(body.Session || '')
        setIsNewPasswordRequired(true)
        return
      }

      throw new Error('Unexpected authentication response from Cognito.')
    } catch (err) {
      setError(err?.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const callCognito = async (target, payload) => {
    const response = await fetch(COGNITO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': target
      },
      body: JSON.stringify(payload)
    })

    const body = await response.json()
    if (!response.ok) {
      throw new Error(getCognitoErrorMessage(body))
    }
    return body
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSignupMessage('')

    if (!COGNITO_CLIENT_ID) {
      setError('Missing VITE_COGNITO_CLIENT_ID in environment configuration.')
      setLoading(false)
      return
    }

    try {
      const email = signupEmail.trim()
      const signUpResponse = await callCognito('AWSCognitoIdentityProviderService.SignUp', {
        ClientId: COGNITO_CLIENT_ID,
        Username: email,
        Password: signupData.password,
        UserAttributes: [
          {
            Name: 'email',
            Value: email
          }
        ]
      })

      setSlideDirection('right')
      setSignupStep('verify')
      const destination = signUpResponse?.CodeDeliveryDetails?.Destination
      setSignupMessage(destination
        ? `Verification code sent to ${destination}.`
        : 'Check your email for the 6-digit verification code.')
    } catch (err) {
      setError(err?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSignupMessage('')

    if (!COGNITO_CLIENT_ID) {
      setError('Missing VITE_COGNITO_CLIENT_ID in environment configuration.')
      setLoading(false)
      return
    }

    try {
      const email = signupEmail.trim()
      await callCognito('AWSCognitoIdentityProviderService.ConfirmSignUp', {
        ClientId: COGNITO_CLIENT_ID,
        Username: email,
        ConfirmationCode: signupData.confirmationCode.trim()
      })

      const authBody = await callCognito('AWSCognitoIdentityProviderService.InitiateAuth', {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: signupData.password
        }
      })

      if (!authBody.AuthenticationResult?.IdToken) {
        throw new Error('Signup confirmed, but auto login failed. Please sign in manually.')
      }

      finalizeSession({
        idToken: authBody.AuthenticationResult.IdToken,
        refreshToken: authBody.AuthenticationResult.RefreshToken,
        username: email
      })
    } catch (err) {
      setError(err?.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setLoading(true)
    setError(null)
    setSignupMessage('')

    try {
      const resendResponse = await callCognito('AWSCognitoIdentityProviderService.ResendConfirmationCode', {
        ClientId: COGNITO_CLIENT_ID,
        Username: signupEmail.trim()
      })
      const destination = resendResponse?.CodeDeliveryDetails?.Destination
      setSignupMessage(destination
        ? `Verification code resent to ${destination}.`
        : 'Verification code sent. Check your email.')
    } catch (err) {
      setError(err?.message || 'Failed to resend verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleNewPasswordSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!COGNITO_CLIENT_ID) {
      setError('Missing VITE_COGNITO_CLIENT_ID in environment configuration.')
      setLoading(false)
      return
    }

    try {
      const username = formData.username.trim()
      const response = await fetch(COGNITO_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge'
        },
        body: JSON.stringify({
          ChallengeName: 'NEW_PASSWORD_REQUIRED',
          ClientId: COGNITO_CLIENT_ID,
          Session: challengeSession,
          ChallengeResponses: {
            USERNAME: username,
            NEW_PASSWORD: formData.newPassword
          }
        })
      })

      const body = await response.json()
      if (!response.ok) {
        throw new Error(getCognitoErrorMessage(body))
      }

      if (!body.AuthenticationResult?.IdToken) {
        throw new Error('Cognito did not return an ID token after password challenge.')
      }

      finalizeSession({
        idToken: body.AuthenticationResult.IdToken,
        refreshToken: body.AuthenticationResult.RefreshToken,
        username
      })
    } catch (err) {
      setError(err?.message || 'Failed to set new password')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSignupChange = (e) => {
    setSignupData({ ...signupData, [e.target.name]: e.target.value })
  }

  const switchAuthMode = (mode) => {
    setSlideDirection(mode === 'signup' ? 'right' : 'left')
    setAuthMode(mode)
    setError(null)
    setSignupMessage('')
    if (mode === 'signup') {
      setIsNewPasswordRequired(false)
      setChallengeSession('')
      setSignupStep('signup')
      setSignupData((prev) => ({ ...prev, confirmationCode: '' }))
    }
  }

  return (
    <>
      <style>{`
        .auth-page-bg {
          background: #020817;
          font-family: 'Inter', sans-serif;
        }

        .dot-grid-canvas {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
        }

        .auth-vignette {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: radial-gradient(ellipse at center, transparent 20%, #020817 75%);
        }

        .auth-glass-card {
          position: relative;
          width: 100%;
          max-width: 500px;
          padding: 36px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 24px 80px rgba(2, 8, 23, 0.55);
        }

        .auth-glass-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.3) 0%,
            rgba(255, 255, 255, 0.05) 50%,
            rgba(255, 255, 255, 0.3) 100%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .auth-input {
          width: 100%;
          border-radius: 12px;
          padding: 12px 16px;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .auth-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .auth-input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 0 20px rgba(26, 115, 232, 0.15);
        }

        .auth-submit {
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 12px;
          color: #ffffff;
          font-weight: 600;
          background: linear-gradient(135deg, #1A73E8, #42A5F5);
          transition: transform 0.2s ease, filter 0.2s ease;
        }

        .auth-submit:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .auth-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
          filter: none;
        }

        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideInFromLeft {
          from { opacity: 0; transform: translateX(-18px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .slide-from-right {
          animation: slideInFromRight 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .slide-from-left {
          animation: slideInFromLeft 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .auth-form-area {
          overflow: hidden;
        }
      `}</style>

      <div className="auth-page-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <canvas ref={canvasRef} className="dot-grid-canvas" />
        <div className="auth-vignette" />

        <div className="w-full max-w-[500px] relative z-10">
          <div className="auth-glass-card">
            <button
              type="button"
              onClick={() => {
                window.location.href = 'https://ketoy.dev'
              }}
              className="absolute top-4 left-4 text-[13px] text-white/60 hover:text-white transition-colors bg-transparent border-0"
            >
              ← Back
            </button>

            <div className="text-center mb-6 mt-2">
              <div className="inline-flex items-center justify-center mx-auto mb-4 h-10">
                <img src="/T_ketoy_logo.png" alt="Ketoy" height="44" className="h-11 w-11 object-contain" />
              </div>
              <div
                key={authMode}
                className={`slide-from-${slideDirection}`}
              >
                <h1 className="text-3xl font-semibold text-white">{authMode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
                <p className="text-white/65 text-sm mt-2">
                  {authMode === 'signin' ? 'Sign in to Ketoy Console' : 'Sign up with your email and verify your account'}
                </p>
              </div>
            </div>

          <div className="mb-4 p-1 rounded-xl bg-white/5 border border-white/10 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => switchAuthMode('signin')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                authMode === 'signin' ? 'bg-blue-500/30 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchAuthMode('signup')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                authMode === 'signup' ? 'bg-blue-500/30 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Create account
            </button>
          </div>

          <div className="auth-form-area">
          <div
            key={`${authMode}-${signupStep}-${isNewPasswordRequired}`}
            className={`slide-from-${slideDirection}`}
          >

          {loading && (
            <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/40 rounded-lg text-blue-300 text-xs">
              Processing authentication. Please wait...
            </div>
          )}

          {error && (
            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-xs">
              {error}
            </div>
          )}

          {signupMessage && authMode === 'signup' && (
            <div className="mb-3 p-2 bg-green-500/10 border border-green-500/50 rounded-lg text-green-300 text-xs">
              {signupMessage}
            </div>
          )}

          {authMode === 'signup' ? (
            signupStep === 'signup' ? (
              <form onSubmit={handleSignUp} className="space-y-2.5">
                <p className="text-xs text-white/70">Email</p>
                <input
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  className="auth-input text-sm"
                />

                <div className="relative">
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Create password"
                    value={signupData.password}
                    onChange={handleSignupChange}
                    required
                    className="auth-input text-sm pr-24"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded-md text-white/70 hover:text-white hover:bg-white/10"
                  >
                    {showSignupPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit text-sm"
                >
                  {loading ? 'Creating...' : 'Create account'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmSignUp} className="space-y-2.5">
                <p className="text-xs text-white/70">Verification code</p>
                <input
                  type="text"
                  name="confirmationCode"
                  placeholder="6-digit code"
                  inputMode="numeric"
                  maxLength={6}
                  value={signupData.confirmationCode}
                  onChange={handleSignupChange}
                  required
                  className="auth-input text-sm"
                />

                <div className="text-xs text-white/70">
                  Didn&apos;t receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-blue-300 hover:text-blue-200 disabled:opacity-60"
                  >
                    Resend code
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit text-sm"
                >
                  {loading ? 'Verifying...' : 'Verify & sign in'}
                </button>
              </form>
            )
          ) : !isNewPasswordRequired ? (
            <form onSubmit={handlePasswordSignIn} className="space-y-2.5">
              <p className="text-xs text-white/70">Username</p>
              <input
                type="text"
                name="username"
                placeholder="Username or email"
                autoComplete="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="auth-input text-sm"
              />

              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="auth-input text-sm"
              />

              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 text-white/70">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-white/30 bg-white/10"
                  />
                  Remember me
                </label>
                <a href="#" className="text-white/70 hover:text-white transition-colors">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-submit text-sm"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleNewPasswordSubmit} className="space-y-2.5">
              <div className="p-2 bg-yellow-500/10 border border-yellow-500/40 rounded-lg text-yellow-300 text-xs">
                New password required. Set a new password to complete sign-in.
              </div>

              <input
                type="password"
                name="newPassword"
                placeholder="New password"
                value={formData.newPassword}
                onChange={handleChange}
                required
                className="auth-input text-sm"
              />

              <button
                type="submit"
                disabled={loading}
                className="auth-submit text-sm"
              >
                {loading ? 'Submitting...' : 'Set new password'}
              </button>
            </form>
          )}
          </div>{/* slide wrapper */}
          </div>{/* auth-form-area */}
          </div>{/* auth-glass-card */}
        </div>
      </div>
    </>
  )
}
