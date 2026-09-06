import { useEffect, useState } from 'react'
import { Apple, Check, Eye, EyeOff, LockKeyhole, Mail, MapPin, Navigation, ShieldCheck, UserRound } from 'lucide-react'
import { api } from '../services/api'
import PhoneOtpLogin from './PhoneOtpLogin'
import '../auth.css'

export default function AuthPanel({ onAuthenticated, error, setError }) {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [form, setForm] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('ridex-signup-fields') || '{}')
      return { name: saved.name || '', email: saved.email || '', password: '', confirmPassword: '', mobile: saved.mobile || '' }
    } catch { return { name: '', email: '', password: '', confirmPassword: '', mobile: '' } }
  })
  const [signupRole, setSignupRole] = useState('customer')
  const [loginRole, setLoginRole] = useState('customer')
  const [googleRole, setGoogleRole] = useState('customer')
  const [showGoogleRole, setShowGoogleRole] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const isLogin = mode === 'login'
  const isForgot = mode === 'forgot'
  const isPhoneAuth = mode === 'phone'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleEmail = params.get('otp_email')
    if (!googleEmail) return undefined
    const timer = setTimeout(() => {
      setForm((current) => ({ ...current, email: googleEmail }))
      setOtpStep(true)
      setSuccessMessage('Google account selected. Enter the verification code sent to your email.')
      window.history.replaceState({}, '', window.location.pathname)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isLogin || isForgot) return
    sessionStorage.setItem('ridex-signup-fields', JSON.stringify({ name: form.name, email: form.email, mobile: form.mobile }))
  }, [form.name, form.email, form.mobile, isLogin, isForgot])

  useEffect(() => {
    if (!resendIn) return undefined
    const timer = setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  const submit = async (event) => {
    event.preventDefault()
    try {
      if (otpStep) {
        const result = await api.verifyOtp(challengeId, otpCode)
        onAuthenticated(result.user)
        return
      }
      if (isForgot) {
        if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
          setError('Enter a valid email address')
          setSuccessMessage('')
          return
        }
        await api.forgotPassword(form.email)
        setSuccessMessage('If an account exists, reset instructions have been sent to your email.')
        setError('')
        return
      }
      if (isLogin) {
        const result = await api.login(form.email, form.password, loginRole)
        setChallengeId(result.challengeId)
        setOtpEmail(result.email)
        setOtpStep(true)
        setResendIn(60)
        setSuccessMessage('A verification code was sent to your registered Gmail address.')
      } else {
        await api.register({ ...form, role: signupRole })
        await api.logout()
        sessionStorage.removeItem('ridex-signup-fields')
        setForm((current) => ({ ...current, password: '' }))
        setMode('login')
        setSuccessMessage('Account created successfully. Please sign in to continue.')
        setError('')
      }
    } catch (requestError) { setError(requestError.message) }
  }

  const requestEmailOtp = async () => {
    try {
      const result = await api.requestOtp(form.email)
      setChallengeId(result.challengeId)
      setOtpEmail(result.email)
      setOtpStep(true)
      setResendIn(60)
      setSuccessMessage('A verification code was sent to your registered Gmail address.')
      setError('')
    } catch (requestError) { setError(requestError.message) }
  }
  const resendOtp = async () => {
    if (resendIn) return
    try {
      const result = await api.requestOtp(form.email)
      setChallengeId(result.challengeId)
      setOtpEmail(result.email)
      setResendIn(60)
      setSuccessMessage('A new verification code was sent to your registered Gmail address.')
      setError('')
    } catch (requestError) { setError(requestError.message) }
  }

  const update = (field) => (event) => { setForm({ ...form, [field]: event.target.value }); if (isForgot && field === 'email') setSuccessMessage('') }
  const inputError = Boolean(error && !error.includes('Reset instructions'))
  const continueWithGoogle = () => {
    setGoogleRole(isLogin ? 'customer' : signupRole)
    setShowGoogleRole(true)
    setError('')
  }
  const startGoogleAuth = () => {
    window.location.assign(`/api/auth/google/start?role=${googleRole}`)
  }

  return <div className="auth-page">
    <section className="auth-story" aria-labelledby="auth-story-title">
      <div className="auth-brand" aria-label="RideX home"><span className="brand-mark" aria-hidden="true">R<span>X</span></span><strong>ridex</strong></div>
      <div className="story-copy"><p className="auth-kicker">MOVE WITH CONFIDENCE</p><h1 id="auth-story-title">{isPhoneAuth ? <>Sign in with<br /><em>your mobile</em></> : isLogin ? <>Welcome <em>back</em></> : <>Your journey<br /><em>starts here.</em></>}</h1><p>Sign in to get live quotes and manage<br />your rides effortlessly.</p></div>
      <div className="city-illustration" aria-hidden="true"><div className="illustration-sun"></div><div className="cityline cityline-one"></div><div className="cityline cityline-two"></div><div className="map-phone"><div className="phone-notch"></div><div className="phone-route"><span></span><i></i></div><MapPin className="phone-pin pin-top" size={18} fill="currentColor" /><MapPin className="phone-pin pin-bottom" size={18} fill="currentColor" /></div><div className="illustration-car"><div className="car-window"></div><div className="car-body"></div><span className="car-wheel wheel-left"></span><span className="car-wheel wheel-right"></span><span className="car-badge">R</span></div></div>
      <div className="auth-benefits" aria-label="RideX benefits"><div><ShieldCheck size={19} aria-hidden="true" /><span><strong>Live Quotes</strong><small>Get real-time<br />price estimates</small></span></div><div><Navigation size={19} aria-hidden="true" /><span><strong>Smart Matching</strong><small>Find the best<br />ride near you</small></span></div><div><LockKeyhole size={19} aria-hidden="true" /><span><strong>Secure Rides</strong><small>Your safety is<br />our priority</small></span></div></div>
    </section>
    <section className="auth-form-side" aria-labelledby="auth-form-title">
      <div className={`auth-card ${isForgot ? 'forgot-card' : ''}`}>
        {isPhoneAuth ? (
          <PhoneOtpLogin 
            onAuthenticated={onAuthenticated}
            error={error}
            setError={setError}
            onBack={() => { setMode('login'); setError(''); setSuccessMessage('') }}
          />
        ) : (
        <>
        <div className="auth-user-icon" aria-hidden="true">{isForgot ? <div className="recovery-mark"><Mail size={25} /><LockKeyhole size={15} /></div> : <UserRound size={28} />}</div>
        <h2 id="auth-form-title">{otpStep ? 'Verify your email' : isForgot ? 'Forgot password?' : isLogin ? 'Sign in' : 'Create account'}</h2>
        <p className="auth-card-copy" id="auth-form-description">{otpStep ? `Enter the 6-digit code sent to ${otpEmail}` : isForgot ? 'Enter your email and we will send reset instructions.' : isLogin ? 'Enter your mobile or Gmail and password' : 'Join RideX and start moving better'}</p>
        <form onSubmit={submit} aria-describedby="auth-form-description" noValidate>
          {otpStep ? <div className="field-group"><label htmlFor="otp-code">Verification code</label><div className="input-wrap"><LockKeyhole size={17} aria-hidden="true" /><input id="otp-code" required inputMode="numeric" pattern="[0-9]{6}" maxLength="6" placeholder="6-digit code" value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ''))} /></div></div> : isForgot ? <div className="field-group"><label htmlFor="forgot-email">Email address</label><div className="input-wrap"><Mail size={17} aria-hidden="true" /><input id="forgot-email" required type="email" autoComplete="email" placeholder="Email address" value={form.email} onChange={update('email')} /></div></div> : <>
          {!isLogin && <div className="field-group"><label htmlFor="full-name">Full name</label><div className="input-wrap"><UserRound size={17} aria-hidden="true" /><input id="full-name" required autoComplete="name" placeholder="Full name" value={form.name} onChange={update('name')} /></div></div>}
          <div className="field-group"><label htmlFor="email">{isLogin ? 'Mobile number / Gmail' : 'Gmail address'}</label><div className="input-wrap"><Mail size={17} aria-hidden="true" /><input id="email" required type={isLogin ? 'text' : 'email'} pattern={isLogin ? undefined : '^[^\\s@]+@gmail\\.com$'} autoComplete="email" placeholder={isLogin ? 'Mobile number or name@gmail.com' : 'name@gmail.com'} value={form.email} onChange={update('email')} aria-invalid={inputError} /></div>{!isLogin && <span className="field-hint">Please use a valid Gmail address ending with @gmail.com.</span>}</div>
          <div className="field-group"><label htmlFor="password">Password</label><div className="input-wrap"><LockKeyhole size={17} aria-hidden="true" /><input id="password" required minLength="8" type={showPassword ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder="Password" value={form.password} onChange={update('password')} aria-invalid={inputError} aria-describedby="password-hint" /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div><span className="field-hint" id="password-hint">At least 8 characters</span></div>
          {isLogin && <div className="field-group"><label htmlFor="login-role">Sign in as</label><div className="input-wrap role-input"><UserRound size={17} aria-hidden="true" /><select id="login-role" value={loginRole} onChange={(event) => setLoginRole(event.target.value)}><option value="customer">Customer</option><option value="partner">Driver / Partner</option><option value="admin">Administrator</option></select></div></div>}
          {!isLogin && <div className="field-group"><label htmlFor="mobile">Mobile number</label><div className="input-wrap"><MapPin size={17} aria-hidden="true" /><input id="mobile" required type="tel" pattern="[6-9][0-9]{9}" autoComplete="tel" placeholder="10-digit Indian mobile number" value={form.mobile} onChange={update('mobile')} /></div></div>}
          {!isLogin && <div className="field-group"><label htmlFor="confirm-password">Confirm password</label><div className="input-wrap"><LockKeyhole size={17} aria-hidden="true" /><input id="confirm-password" required minLength="8" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Confirm password" value={form.confirmPassword} onChange={update('confirmPassword')} /></div></div>}
          {!isLogin && <div className="field-group"><label htmlFor="signup-role">Account type</label><div className="input-wrap"><select id="signup-role" value={signupRole} onChange={(event) => setSignupRole(event.target.value)}><option value="customer">Customer</option><option value="partner">Driver / Partner</option><option value="admin">Administrator</option></select></div></div>}
          </>}
          {successMessage && (!isForgot || form.email.trim()) && <p className="auth-success" role="status">{successMessage}</p>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          {otpStep && <button type="button" className="forgot-button" onClick={resendOtp} disabled={resendIn > 0}>Resend OTP {resendIn ? `(${resendIn}s)` : ''}</button>}
          {isLogin && !otpStep && <div className="auth-options"><label className="remember" htmlFor="remember"><input id="remember" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span aria-hidden="true"><Check size={12} /></span> Remember me</label><button type="button" className="forgot-button" onClick={() => { setMode('forgot'); setError(''); setSuccessMessage('') }}>Forgot password?</button></div>}
          <button className="auth-submit" type="submit">{otpStep ? 'Verify and sign in' : isForgot ? 'Send reset instructions' : isLogin ? 'Sign in' : 'Create account'} <span aria-hidden="true">→</span></button>
        </form>
        {isForgot && <div className="security-note"><ShieldCheck size={21} aria-hidden="true" /><span><strong>We take your security seriously.</strong><small>Reset link will expire in 15 minutes.</small></span></div>}
        {isLogin && !otpStep && <div className="login-otp-links" style={{ display: 'grid', gap: '8px', fontSize: '10px' }}><button type="button" className="otp-link" onClick={requestEmailOtp}><Mail size={15} aria-hidden="true" /> Use email OTP instead <span aria-hidden="true">→</span></button><button type="button" className="otp-link mobile-otp-link" onClick={() => { setMode('phone'); setError(''); setSuccessMessage('') }} style={{ borderColor: '#13b9a7', color: '#08a995' }}><MapPin size={15} aria-hidden="true" /> Sign in with mobile <span aria-hidden="true">→</span></button></div>}
        {!isForgot && <><div className="auth-divider" role="separator"><span>or</span></div>
        {showGoogleRole && <div className="google-role-picker"><label htmlFor="google-role">Choose account type</label><select id="google-role" value={googleRole} onChange={(event) => setGoogleRole(event.target.value)}><option value="customer">Customer</option><option value="partner">Driver / Partner</option></select><button className="google-confirm" type="button" onClick={startGoogleAuth}>Continue as {googleRole === 'partner' ? 'Driver / Partner' : 'Customer'} <span aria-hidden="true">→</span></button></div>}
        {!showGoogleRole && <div className="social-buttons"><button className="google-button" type="button" onClick={continueWithGoogle}><b aria-hidden="true">G</b> Google</button><button className="apple-button" type="button" onClick={() => setError('Apple sign in is not configured yet.')}><Apple size={16} aria-hidden="true" /> Apple</button></div>}</>}
        {(!isLogin || otpStep) && <p className={`auth-switch ${isForgot ? 'forgot-switch' : ''}`}>{otpStep ? 'Wrong email?' : 'Remembered your password?'} <button type="button" onClick={() => { setOtpStep(false); setOtpCode(''); setMode(isForgot || !isLogin ? 'login' : 'register'); setError(''); setSuccessMessage('') }}>{otpStep || isForgot ? 'Back to sign in' : 'Sign in'} {isForgot && <span aria-hidden="true">→</span>}</button></p>}
        </>
        )}
      </div>
      {isLogin && <div className="new-user-card"><div><strong>New here?</strong><p>Create an account and unlock<br />exclusive offers.</p></div><span aria-hidden="true">🎁</span><button type="button" onClick={() => { setMode('register'); setError(''); setSuccessMessage('') }}>Create account <span aria-hidden="true">→</span></button></div>}
    </section>
  </div>
}