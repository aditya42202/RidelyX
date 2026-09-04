import { useEffect, useState } from 'react'
import { Phone, LockKeyhole, ChevronLeft } from 'lucide-react'
import { phoneAuth } from '../services/phoneAuthService'
import { api } from '../services/api'
import '../auth.css'

export default function PhoneOtpLogin({ onAuthenticated, error, setError, onBack }) {
  const [step, setStep] = useState('phone') // 'phone' | 'otp' | 'register'
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [userName, setUserName] = useState('')
  const [registrationRole, setRegistrationRole] = useState('customer')

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      phoneAuth.cleanupRecaptcha()
    }
  }, [])

  // Resend cooldown timer
  useEffect(() => {
    if (!resendIn) return undefined
    const timer = setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  const formatPhoneDisplay = (phone) => {
    const cleaned = String(phone).replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
    }
    return `+91 ${cleaned}`
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    try {
      if (!phoneNumber.trim()) {
        setError('Please enter your mobile number')
        return
      }

      setLoading(true)

      // Send OTP via Firebase
      await phoneAuth.sendOTP(phoneNumber, 'phone-recaptcha-container')

      setStep('otp')
      setSuccessMessage(`OTP sent to ${formatPhoneDisplay(phoneNumber)}`)
      setResendIn(60)
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
      phoneAuth.cleanupRecaptcha()
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    try {
      if (!otpCode.trim()) {
        setError('Please enter the OTP')
        return
      }

      setLoading(true)

      // Verify OTP and get Firebase token
      const result = await phoneAuth.verifyOTP(otpCode)

      // Try to login with Firebase token
      try {
        const loginResult = await api.firebasePhoneLogin(result.idToken)
        onAuthenticated(loginResult.user)
      } catch (loginErr) {
        // Check if registration is required
        if (loginErr.message.includes('New user detected') || loginErr.message.includes('404')) {
          setFirebaseUser(result.user)
          setStep('register')
          setSuccessMessage('New user detected. Please complete your profile to continue.')
        } else {
          throw loginErr
        }
      }
    } catch (err) {
      setError(err.message || 'OTP verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    try {
      if (!userName.trim()) {
        setError('Please enter your name')
        return
      }

      if (userName.trim().length > 80) {
        setError('Name must be 80 characters or fewer')
        return
      }

      setLoading(true)

      // Get fresh ID token (the previous one might have expired)
      const freshIdToken = await phoneAuth.confirmationResult?.user?.getIdToken()
      if (!freshIdToken) {
        throw new Error('Session expired. Please start over.')
      }

      const registerResult = await api.firebasePhoneRegister(
        freshIdToken,
        userName.trim(),
        registrationRole
      )

      onAuthenticated(registerResult.user)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (resendIn > 0) return

    setError('')
    try {
      setLoading(true)
      // Clean up old verifier and send new OTP
      phoneAuth.cleanupRecaptcha()
      await phoneAuth.sendOTP(phoneNumber, 'phone-recaptcha-container')
      setOtpCode('')
      setResendIn(60)
      setSuccessMessage('New OTP sent to your mobile number')
    } catch (err) {
      setError(err.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'phone') {
      onBack?.()
    } else if (step === 'otp') {
      phoneAuth.cleanupRecaptcha()
      setStep('phone')
      setOtpCode('')
      setPhoneNumber('')
      setSuccessMessage('')
      setError('')
    } else if (step === 'register') {
      setStep('otp')
      setUserName('')
      setSuccessMessage('')
      setError('')
    }
  }

  return (
    <div className="phone-auth-container">
      <button
        type="button"
        className="phone-auth-back"
        onClick={handleBack}
        title="Go back"
        aria-label="Go back"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>

      {step === 'phone' && (
        <div className="phone-auth-step">
          <div className="phone-auth-header">
            <div className="phone-auth-icon">
              <Phone size={24} aria-hidden="true" />
            </div>
            <h3>Continue with Mobile</h3>
            <p>Sign in or create account with your Indian mobile number</p>
          </div>

          <form onSubmit={handleSendOTP} noValidate>
            <div className="field-group">
              <label htmlFor="phone-input">Mobile number</label>
              <div className="phone-input-wrapper">
                <span className="phone-prefix">+91</span>
                <input
                  id="phone-input"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength="10"
                  placeholder="10-digit number"
                  value={phoneNumber}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '')
                    setPhoneNumber(cleaned)
                    setError('')
                  }}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  required
                />
              </div>
              <span className="field-hint">Must be a valid Indian mobile number (6-9 XXXXXXXXX)</span>
            </div>

            {successMessage && <p className="auth-success" role="status">{successMessage}</p>}
            {error && <p className="auth-error" role="alert">{error}</p>}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading || phoneNumber.length !== 10}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          {/* reCAPTCHA will be rendered here */}
          <div id="phone-recaptcha-container" className="recaptcha-container"></div>
        </div>
      )}

      {step === 'otp' && (
        <div className="phone-auth-step">
          <div className="phone-auth-header">
            <div className="phone-auth-icon">
              <LockKeyhole size={24} aria-hidden="true" />
            </div>
            <h3>Verify OTP</h3>
            <p>Enter the 6-digit code sent to {formatPhoneDisplay(phoneNumber)}</p>
          </div>

          <form onSubmit={handleVerifyOTP} noValidate>
            <div className="field-group">
              <label htmlFor="otp-input">Verification code</label>
              <div className="input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength="6"
                  placeholder="6-digit code"
                  value={otpCode}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '')
                    setOtpCode(cleaned)
                    setError('')
                  }}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  required
                />
              </div>
            </div>

            {successMessage && <p className="auth-success" role="status">{successMessage}</p>}
            {error && <p className="auth-error" role="alert">{error}</p>}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading || otpCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify and Sign In'}
              <span aria-hidden="true">→</span>
            </button>

            <button
              type="button"
              className="forgot-button"
              onClick={handleResendOTP}
              disabled={resendIn > 0 || loading}
            >
              Resend OTP {resendIn ? `(${resendIn}s)` : ''}
            </button>
          </form>
        </div>
      )}

      {step === 'register' && (
        <div className="phone-auth-step">
          <div className="phone-auth-header">
            <div className="phone-auth-icon">
              <Phone size={24} aria-hidden="true" />
            </div>
            <h3>Create Account</h3>
            <p>Complete your profile to get started</p>
          </div>

          <form onSubmit={handleRegister} noValidate>
            <div className="field-group">
              <label htmlFor="full-name">Full name</label>
              <div className="input-wrap">
                <Phone size={17} aria-hidden="true" />
                <input
                  id="full-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value)
                    setError('')
                  }}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="account-type">Account type</label>
              <div className="input-wrap role-input">
                <Phone size={17} aria-hidden="true" />
                <select
                  id="account-type"
                  value={registrationRole}
                  onChange={(e) => setRegistrationRole(e.target.value)}
                  disabled={loading}
                >
                  <option value="customer">Customer</option>
                  <option value="partner">Driver / Partner</option>
                </select>
              </div>
            </div>

            {successMessage && <p className="auth-success" role="status">{successMessage}</p>}
            {error && <p className="auth-error" role="alert">{error}</p>}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading || !userName.trim()}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
