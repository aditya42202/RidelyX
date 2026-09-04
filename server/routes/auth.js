import express from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import nodemailer from 'nodemailer'
import mongoose from 'mongoose'
import User from '../models/User.js'
import OtpChallenge from '../models/OtpChallenge.js'
import { requireAuth, signToken } from '../middleware/auth.js'
import { store } from '../store.js'

const router = express.Router()

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || user.mobile,
  mobile: user.mobile || user.phone,
  role: user.role,
  walletBalance: user.walletBalance,
  rating: user.rating,
  isVerified: user.isVerified
})

// For development: fallback to store
const normalizeMobile = (value) => {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2)
  if (!/^[6-9]\d{9}$/.test(digits)) return null
  return `+91${digits}`
}
const mobileVariants = (value) => {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2)
  if (!/^[6-9]\d{9}$/.test(digits)) return []
  return [`+91${digits}`, `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`, digits]
}
const isGmail = (value) => /^[^\s@]+@gmail\.com$/i.test(String(value || '').trim())
const findUserDev = async (identifier) => {
  const value = String(identifier || '').trim().toLowerCase()
  const mobile = normalizeMobile(value)
  const query = mobile ? { $or: [{ mobile: { $in: mobileVariants(value) } }, { phone: { $in: mobileVariants(value) } }] } : { email: value }
  if (mongoose.connection.readyState === 1) {
    return await User.findOne(query).select('+password')
  }
  return store.users.find((user) => mobile ? (user.mobile || user.phone) === mobile : user.email === value)
}

const createOtp = () => String(crypto.randomInt(100000, 1000000))
const hashOtp = (code) => crypto.createHash('sha256').update(code).digest('hex')
const sendLoginOtp = async (user, code) => {
  const transport = otpTransport()
  if (!transport) throw new Error('Email delivery is not configured')
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: 'Your RideX login verification code',
      text: `Your RideX verification code is ${code}. It expires in 5 minutes.`,
    })
  } catch (error) {
    throw new Error(`Email delivery failed: ${error.message}`, { cause: error })
  }
}
const issueOtp = async (user) => {
  const mobile = normalizeMobile(user.mobile || user.phone)
  const code = createOtp()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
  if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(user._id)) {
    const recent = await OtpChallenge.findOne({ user: user._id, createdAt: { $gt: new Date(Date.now() - 60 * 1000) }, verified: false })
    if (recent) return { challengeId: recent._id.toString(), email: user.email }
    await OtpChallenge.updateMany({ user: user._id, verified: false }, { verified: true })
    const challenge = await OtpChallenge.create({ user: user._id, mobile, email: user.email, otpHash: hashOtp(code), expiresAt })
    try {
      await sendLoginOtp(user, code)
    } catch (error) {
      await OtpChallenge.deleteOne({ _id: challenge._id })
      throw error
    }
    return { challengeId: challenge._id.toString(), email: user.email }
  }
  const key = `login:${user._id}`
  const existing = store.otpChallenges.get(key)
  if (existing && existing.createdAt > Date.now() - 60 * 1000) return { challengeId: key, email: user.email }
  store.otpChallenges.set(key, { userId: user._id, hash: hashOtp(code), expiresAt: expiresAt.getTime(), attempts: 0, createdAt: Date.now(), verified: false })
  try {
    await sendLoginOtp(user, code)
  } catch (error) {
    store.otpChallenges.delete(key)
    throw error
  }
  return { challengeId: key, email: user.email }
}

const otpTransport = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  })
}

// Google OAuth Start
router.get('/google/start', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(503).send('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.')
  }
  const state = crypto.randomBytes(24).toString('hex')
  res.cookie('ridex_oauth_state', `${state}:${req.query.role === 'partner' ? 'partner' : 'customer'}`, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000
  })
  const query = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${query}`)
})

// Google OAuth Callback
router.get('/google/callback', async (req, res, next) => {
  try {
    const [expectedState, role] = (req.cookies.ridex_oauth_state || ':customer').split(':')
    if (!req.query.code || !req.query.state || req.query.state !== expectedState) {
      return res.status(400).send('Invalid Google OAuth state')
    }
    if (!process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).send('Google OAuth is not configured. Set GOOGLE_CLIENT_SECRET.')
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: req.query.code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok) {
      return res.status(502).send('Google authorization could not be completed')
    }

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })

    const profile = await profileResponse.json()
    if (!profileResponse.ok || !profile.email) {
      return res.status(502).send('Google account email could not be verified')
    }

    const normalizedEmail = profile.email.toLowerCase().trim()
    let user = await findUserDev(normalizedEmail)

    if (!user) {
      if (mongoose.connection.readyState !== 1) {
        // Development: create in store
        user = {
          _id: `user-${Date.now()}`,
          name: profile.name || profile.email.split('@')[0],
          email: normalizedEmail,
          password: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10),
          role,
          walletBalance: 0,
          profileImage: profile.picture
        }
        store.users.push(user)
      } else {
        // Production: create in MongoDB
        user = await User.create({
          name: profile.name || profile.email.split('@')[0],
          email: normalizedEmail,
          password: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10),
          role,
          profileImage: profile.picture
        })
      }
    }

    const transport = otpTransport()
    if (!transport) {
      return res.status(503).send('Google account selected, but OTP email delivery is not configured')
    }

    const code = String(crypto.randomInt(100000, 1000000))
    store.otpChallenges.set(normalizedEmail, {
      hash: crypto.createHash('sha256').update(code).digest('hex'),
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      purpose: 'login'
    })

    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: normalizedEmail,
      subject: 'Your RideX verification code',
      text: `Your RideX verification code is ${code}. It expires in 10 minutes.`
    })

    res.clearCookie('ridex_oauth_state').redirect(
      `${process.env.CLIENT_URL || 'http://localhost:5173'}/?otp_email=${encodeURIComponent(normalizedEmail)}`
    )
  } catch (error) {
    next(error)
  }
})

// Request OTP
router.post('/otp/request', async (req, res, next) => {
  try {
    const user = await findUserDev(req.body.identifier || req.body.email)
    if (!user) return res.status(404).json({ success: false, message: 'Account not found. Please signup first.' })
    const challenge = await issueOtp(user)
    res.json({ success: true, message: 'OTP sent to your registered Gmail address.', ...challenge })
  } catch (error) {
    if (error.message.includes('wait')) return res.status(429).json({ success: false, message: error.message })
    if (error.message.includes('Email') || error.message.includes('configured')) return res.status(503).json({ success: false, message: 'OTP could not be sent. Please check the email provider configuration and Gmail App Password.' })
    next(error)
  }
})

// Verify OTP
router.post('/otp/verify', async (req, res, next) => {
  try {
    const challengeId = String(req.body.challengeId || '')
    let challenge
    let user
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(challengeId)) {
      challenge = await OtpChallenge.findById(challengeId)
      user = challenge?.user ? await User.findById(challenge.user) : null
    } else {
      challenge = store.otpChallenges.get(challengeId)
      user = challenge ? store.users.find((item) => item._id === challenge.userId) : null
    }
    if (!challenge || !user || challenge.verified || new Date(challenge.expiresAt).getTime() < Date.now()) return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' })
    if (challenge.attempts >= 5) return res.status(429).json({ success: false, message: 'Too many OTP attempts. Please request a new OTP.' })
    challenge.attempts += 1
    if (hashOtp(String(req.body.code || '')) !== challenge.otpHash && hashOtp(String(req.body.code || '')) !== challenge.hash) return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' })
    challenge.verified = true
    if (challenge.save) await challenge.save()
    else store.otpChallenges.delete(challengeId)
    const token = signToken(user)
    res.cookie('ridex_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({ success: true, user: publicUser(user) })
  } catch (error) {
    if (error.message.includes('Email') || error.message.includes('configured')) return res.status(503).json({ success: false, message: 'OTP could not be sent. Please check the email provider configuration.' })
    next(error)
  }
})

// Register (Direct signup without OTP)
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, role = 'customer' } = req.body
    const mobile = normalizeMobile(req.body.mobile || req.body.phone)

    if (!name || !email || !password || !confirmPassword || !mobile) {
      return res.status(400).json({ success: false, message: 'Full name, mobile number, Gmail, password, and confirmation are required' })
    }
    if (!isGmail(email)) return res.status(400).json({ success: false, message: 'Please use a valid Gmail address ending with @gmail.com.' })
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' })

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' })
    }

    if (!['customer', 'partner', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Choose a valid account type' })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const existingEmail = await findUserDev(normalizedEmail)
    if (existingEmail) return res.status(409).json({ success: false, message: 'This Gmail address is already registered. Please login instead.' })
    const existingMobile = await findUserDev(mobile)
    if (existingMobile) return res.status(409).json({ success: false, message: 'This mobile number is already registered. Please use a different number.' })

    let user
    if (mongoose.connection.readyState !== 1) {
      // Development: create in store
      user = {
        _id: `user-${Date.now()}`,
        name,
        email: normalizedEmail,
        phone: mobile,
        mobile,
        password: await bcrypt.hash(password, 10),
        role,
        walletBalance: 0
      }
      store.users.push(user)
    } else {
      // Production: create in MongoDB
      user = await User.create({
        name,
        email: normalizedEmail,
        phone: mobile,
        mobile,
        password: await bcrypt.hash(password, 10),
        role
      })
    }

    const token = signToken(user)
    res.cookie('ridex_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
      .status(201)
      .json({ success: true, user: publicUser(user) })
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0]
      const message = duplicateField === 'mobile'
        ? 'This mobile number is already registered. Please use a different number.'
        : 'This Gmail address is already registered. Please login instead.'
      return res.status(409).json({ success: false, message })
    }
    next(error)
  }
})

// Login
router.post('/login', async (req, res, next) => {
  try {
    const identifier = req.body.identifier || req.body.email
    const password = req.body.password || ''
    const requestedRole = ['customer', 'partner', 'admin'].includes(req.body.role) ? req.body.role : null

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please enter your mobile/email and password.' })
    }

    const user = await findUserDev(identifier)

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found. Please signup first.' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' })
    }

    if (requestedRole && user.role !== requestedRole) {
      const accountType = user.role === 'partner' ? 'Driver / Partner' : user.role === 'admin' ? 'Administrator' : 'Customer'
      return res.status(401).json({
        success: false,
        message: `This account is registered as ${accountType}. Select that account type to continue.`
      })
    }

    const challenge = await issueOtp(user)
    res.json({ success: true, otpRequired: true, ...challenge })
  } catch (error) {
    if (error.message.includes('Email') || error.message.includes('configured')) return res.status(503).json({ success: false, message: 'OTP could not be sent. Please check the email provider configuration and Gmail App Password.' })
    next(error)
  }
})

// Google Login (for demo/quick access)
router.post('/google', async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase().trim() || 'arjun@ridex.app'

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email })
      if (!user) {
        return res.status(404).json({ success: false, message: 'Account not found. Please signup first.' })
      }
      const token = signToken(user)
      res.cookie('ridex_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
        .json({ success: true, user: publicUser(user), provider: 'google' })
    } else {
      // Development fallback
      const user = store.users.find((u) => u.email === email) || store.users[0]
      if (!user) {
        return res.status(503).json({ success: false, message: 'Database unavailable. Please try again.' })
      }
      const token = signToken(user)
      res.cookie('ridex_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
        .json({ success: true, user: publicUser(user), provider: 'google-demo' })
    }
  } catch (error) {
    next(error)
  }
})

// Logout
router.post('/logout', (_req, res) => {
  res.clearCookie('ridex_token').json({ success: true, message: 'Logged out successfully' })
})

// Get Current User
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    let user
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.auth.id)
    } else {
      user = store.users.find((item) => item._id === req.auth.id)
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' })
    }

    res.json({ success: true, user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

// Update Profile
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const name = req.body.name?.trim()
    const phone = req.body.phone?.trim() || undefined
    const profileImage = req.body.profileImage?.trim() || undefined

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' })
    }

    if (name.length > 80) {
      return res.status(400).json({ success: false, message: 'Name must be 80 characters or fewer' })
    }

    if (phone && phone.length > 30) {
      return res.status(400).json({ success: false, message: 'Phone number must be 30 characters or fewer' })
    }

    const updates = { name, phone, profileImage }

    let user
    if (mongoose.connection.readyState === 1) {
      user = await User.findByIdAndUpdate(req.auth.id, updates, { new: true, runValidators: true })
    } else {
      user = store.users.find((item) => item._id === req.auth.id)
      if (user) Object.assign(user, updates)
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' })
    }

    res.json({ success: true, user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

// Support Request
router.post('/support', requireAuth, async (req, res, next) => {
  try {
    const category = req.body.category?.trim()
    const message = req.body.message?.trim()

    if (!category || !message) {
      return res.status(400).json({ success: false, message: 'Request type and message are required' })
    }

    if (message.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message must be 2000 characters or fewer' })
    }

    let user
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.auth.id)
    } else {
      user = store.users.find((item) => item._id === req.auth.id)
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' })
    }

    const transport = otpTransport()
    if (!transport) {
      return res.status(503).json({
        success: false,
        message: 'Email notifications are not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.'
      })
    }

    const recipient = process.env.SMTP_FROM || process.env.SMTP_USER
    await transport.sendMail({
      from: recipient,
      to: recipient,
      replyTo: user.email,
      subject: `RideX support request: ${category}`,
      text: `A new ${category.toLowerCase()} request was submitted by ${user.name || 'RideX user'} (${user.email}).\n\n${message}`
    })

    await transport.sendMail({
      from: recipient,
      to: user.email,
      subject: 'RideX support request received',
      text: `We received your ${category.toLowerCase()} request. Our support team will contact you shortly.`
    })

    res.json({ success: true, message: 'Support request sent successfully' })
  } catch (error) {
    next(error)
  }
})

// Forgot Password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase().trim()

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' })
    }

    let user
    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({ email }).select('+resetTokenHash +resetTokenExpiresAt')
    } else {
      user = store.users.find((item) => item.email === email)
    }

    if (user) {
      const token = crypto.randomBytes(32).toString('hex')
      user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex')
      user.resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000)

      if (user.save) {
        await user.save()
      }

      const transport = otpTransport()
      if (transport) {
        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/?reset_token=${token}`
        await transport.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: 'RideX Password Reset',
          text: `Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 15 minutes.`
        })
      }
    }

    // Always return success for security (don't reveal if email exists)
    res.json({ success: true, message: 'If an account exists, reset instructions will be sent.' })
  } catch (error) {
    next(error)
  }
})

// Reset Password
router.post('/reset-password', async (req, res, next) => {
  try {
    const token = req.body.token
    const password = req.body.password

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Reset token and new password are required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' })
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database connection unavailable. Please try again.' })
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: { $gt: new Date() }
    }).select('+password +resetTokenHash +resetTokenExpiresAt')

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset request' })
    }

    user.password = await bcrypt.hash(password, 10)
    user.resetTokenHash = undefined
    user.resetTokenExpiresAt = undefined
    await user.save()

    res.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    next(error)
  }
})

// Firebase Phone OTP Login
router.post('/firebase-phone', async (req, res, next) => {
  try {
    const idToken = req.body.idToken
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Firebase ID token is required' })
    }

    // Verify Firebase token using the middleware logic
    let firebaseUser
    try {
      const { admin, isFirebaseConfigured } = await import('../config/firebaseAdmin.js')
      if (!isFirebaseConfigured) {
        return res.status(503).json({ success: false, message: 'Firebase is not configured on the backend' })
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken)
      const phoneNumber = decodedToken.phone_number
      const firebaseUid = decodedToken.uid

      if (!phoneNumber) {
        return res.status(400).json({ success: false, message: 'Phone number not verified in Firebase token' })
      }

      firebaseUser = { uid: firebaseUid, phoneNumber, email: decodedToken.email || null }
    } catch (firebaseError) {
      if (firebaseError.code === 'auth/id-token-expired') {
        return res.status(401).json({ success: false, message: 'Firebase token has expired. Please login again.' })
      } else if (firebaseError.code === 'auth/invalid-id-token') {
        return res.status(401).json({ success: false, message: 'Invalid Firebase token' })
      }
      return res.status(401).json({ success: false, message: 'Firebase token verification failed' })
    }

    // Normalize phone number
    const normalizedPhone = normalizeMobile(firebaseUser.phoneNumber)
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, message: 'Invalid phone number in Firebase token' })
    }

    let user
    if (mongoose.connection.readyState === 1) {
      // Check if user exists by phone number or Firebase UID
      user = await User.findOne({
        $or: [
          { firebaseUid: firebaseUser.uid },
          { mobile: { $in: mobileVariants(normalizedPhone) } }
        ]
      })

      if (!user) {
        // User doesn't exist - return signal for registration
        return res.status(404).json({
          success: false,
          requiresRegistration: true,
          message: 'New user detected',
          firebaseUser: {
            uid: firebaseUser.uid,
            phoneNumber: normalizedPhone,
            email: firebaseUser.email
          }
        })
      }

      // Existing user - link Firebase UID if not already linked
      if (!user.firebaseUid) {
        user.firebaseUid = firebaseUser.uid
        user.phoneVerified = true
        await user.save()
      }
    } else {
      // Development: use store
      user = store.users.find(u => 
        u.firebaseUid === firebaseUser.uid || 
        (u.mobile || u.phone) === normalizedPhone
      )

      if (!user) {
        return res.status(404).json({
          success: false,
          requiresRegistration: true,
          message: 'New user detected',
          firebaseUser: {
            uid: firebaseUser.uid,
            phoneNumber: normalizedPhone,
            email: firebaseUser.email
          }
        })
      }

      if (!user.firebaseUid) {
        user.firebaseUid = firebaseUser.uid
        user.phoneVerified = true
      }
    }

    // Existing user - login
    const token = signToken(user)
    res.cookie('ridex_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({ 
        success: true, 
        user: publicUser(user),
        message: 'Logged in successfully'
      })
  } catch (error) {
    next(error)
  }
})

// Firebase Phone Registration
router.post('/firebase-phone-register', async (req, res, next) => {
  try {
    const { idToken, name, role = 'customer' } = req.body

    if (!idToken || !name) {
      return res.status(400).json({ success: false, message: 'Firebase ID token, name, and role are required' })
    }

    if (!['customer', 'partner'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Choose customer or partner.' })
    }

    // Verify Firebase token
    let firebaseUser
    try {
      const { admin, isFirebaseConfigured } = await import('../config/firebaseAdmin.js')
      if (!isFirebaseConfigured) {
        return res.status(503).json({ success: false, message: 'Firebase is not configured on the backend' })
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken)
      const phoneNumber = decodedToken.phone_number
      const firebaseUid = decodedToken.uid

      if (!phoneNumber) {
        return res.status(400).json({ success: false, message: 'Phone number not verified in Firebase token' })
      }

      firebaseUser = { uid: firebaseUid, phoneNumber, email: decodedToken.email || null }
    } catch (firebaseError) {
      if (firebaseError.code === 'auth/id-token-expired') {
        return res.status(401).json({ success: false, message: 'Firebase token has expired. Please login again.' })
      }
      return res.status(401).json({ success: false, message: 'Firebase token verification failed' })
    }

    // Normalize phone number
    const normalizedPhone = normalizeMobile(firebaseUser.phoneNumber)
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' })
    }

    if (mongoose.connection.readyState === 1) {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { firebaseUid: firebaseUser.uid },
          { mobile: { $in: mobileVariants(normalizedPhone) } }
        ]
      })

      if (existingUser) {
        return res.status(409).json({ success: false, message: 'This phone number is already registered.' })
      }

      // Generate unique email for phone-based registration (since email is required but not needed for phone auth)
      const phoneBasedEmail = `phone-${Date.now()}@ridex.phone`

      // Create new user
      const user = await User.create({
        name: name.trim(),
        email: phoneBasedEmail,
        mobile: normalizedPhone,
        phone: normalizedPhone,
        password: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10),
        role,
        firebaseUid: firebaseUser.uid,
        phoneVerified: true
      })

      const token = signToken(user)
      res.cookie('ridex_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
        .status(201)
        .json({
          success: true,
          user: publicUser(user),
          message: 'Account created successfully'
        })
    } else {
      // Development: use store
      const existingUser = store.users.find(u =>
        u.firebaseUid === firebaseUser.uid ||
        (u.mobile || u.phone) === normalizedPhone
      )

      if (existingUser) {
        return res.status(409).json({ success: false, message: 'This phone number is already registered.' })
      }

      const phoneBasedEmail = `phone-${Date.now()}@ridex.phone`
      const user = {
        _id: `user-${Date.now()}`,
        name: name.trim(),
        email: phoneBasedEmail,
        mobile: normalizedPhone,
        phone: normalizedPhone,
        password: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10),
        role,
        firebaseUid: firebaseUser.uid,
        phoneVerified: true,
        walletBalance: 0
      }
      store.users.push(user)

      const token = signToken(user)
      res.cookie('ridex_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
        .status(201)
        .json({
          success: true,
          user: publicUser(user),
          message: 'Account created successfully'
        })
    }
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0]
      const message = duplicateField === 'mobile'
        ? 'This mobile number is already registered.'
        : 'This account already exists.'
      return res.status(409).json({ success: false, message })
    }
    next(error)
  }
})

export default router
