import { auth, isFirebaseConfigured } from '../config/firebase'
import { signInWithPhoneNumber, RecaptchaVerifier, PhoneAuthProvider, signInWithCredential } from 'firebase/auth'

class PhoneAuthService {
  constructor() {
    this.recaptchaVerifier = null
    this.confirmationResult = null
    this.phoneNumber = null
  }

  /**
   * Initialize reCAPTCHA verifier
   * @param {string} containerId - HTML element ID for reCAPTCHA widget
   */
  initializeRecaptcha(containerId) {
    if (this.recaptchaVerifier) {
      return Promise.resolve(this.recaptchaVerifier)
    }

    return new Promise((resolve, reject) => {
      try {
        this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
          size: 'normal',
          callback: () => {
            // reCAPTCHA solved
          },
          'expired-callback': () => {
            this.recaptchaVerifier = null
          },
          'error-callback': () => {
            this.recaptchaVerifier = null
          }
        })
        resolve(this.recaptchaVerifier)
      } catch (error) {
        reject(new Error(`reCAPTCHA initialization failed: ${error.message}`))
      }
    })
  }

  /**
   * Validate Indian mobile number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean}
   */
  validateIndianPhoneNumber(phoneNumber) {
    const cleanedNumber = String(phoneNumber || '').replace(/\D/g, '')
    
    // Check if it's exactly 10 digits (Indian mobile number)
    if (cleanedNumber.length !== 10) {
      return false
    }
    
    // Check if it starts with 6-9 (valid Indian mobile prefix)
    if (!/^[6-9]/.test(cleanedNumber)) {
      return false
    }
    
    return true
  }

  /**
   * Format phone number to +91 format
   * @param {string} phoneNumber - Phone number to format
   * @returns {string}
   */
  formatPhoneNumber(phoneNumber) {
    const cleanedNumber = String(phoneNumber || '').replace(/\D/g, '')
    
    if (cleanedNumber.length === 10) {
      return `+91${cleanedNumber}`
    }
    
    if (cleanedNumber.length === 12 && cleanedNumber.startsWith('91')) {
      return `+${cleanedNumber}`
    }
    
    return null
  }

  /**
   * Send OTP to phone number
   * @param {string} phoneNumber - Phone number (10 digits or +91 format)
   * @param {string} recaptchaContainerId - HTML element ID for reCAPTCHA
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async sendOTP(phoneNumber, recaptchaContainerId = 'recaptcha-container') {
    try {
      // Check if Firebase is configured
      if (!isFirebaseConfigured) {
        throw new Error('Firebase: Error (auth/configuration-not-found). Please configure Firebase credentials in .env file.')
      }

      // Validate phone number format
      if (!this.validateIndianPhoneNumber(phoneNumber)) {
        throw new Error('Please enter a valid 10-digit Indian mobile number (starting with 6-9)')
      }

      // Format phone number
      const formattedNumber = this.formatPhoneNumber(phoneNumber)
      if (!formattedNumber) {
        throw new Error('Invalid phone number format')
      }

      // Initialize reCAPTCHA
      await this.initializeRecaptcha(recaptchaContainerId)

      // Send OTP
      this.phoneNumber = formattedNumber
      this.confirmationResult = await signInWithPhoneNumber(auth, formattedNumber, this.recaptchaVerifier)

      return {
        success: true,
        message: `OTP sent to ${formattedNumber}`
      }
    } catch (error) {
      // Handle specific Firebase errors
      if (error.code === 'auth/invalid-phone-number') {
        throw new Error('Invalid phone number format')
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many OTP requests. Please try again later.')
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Phone authentication is not enabled on this Firebase project')
      }

      throw new Error(error.message || 'Failed to send OTP')
    }
  }

  /**
   * Verify OTP code
   * @param {string} otpCode - 6-digit OTP code
   * @returns {Promise<{idToken: string, user: Object}>}
   */
  async verifyOTP(otpCode) {
    try {
      if (!this.confirmationResult) {
        throw new Error('Please send OTP first')
      }

      if (!otpCode || otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
        throw new Error('Please enter a valid 6-digit OTP')
      }

      // Verify the OTP
      const result = await this.confirmationResult.confirm(otpCode)

      // Get the ID token for backend verification
      const idToken = await result.user.getIdToken()

      return {
        success: true,
        idToken,
        user: {
          uid: result.user.uid,
          phoneNumber: result.user.phoneNumber,
          email: result.user.email
        }
      }
    } catch (error) {
      // Handle specific Firebase errors
      if (error.code === 'auth/invalid-verification-code') {
        throw new Error('Invalid OTP. Please check and try again.')
      } else if (error.code === 'auth/code-expired') {
        throw new Error('OTP has expired. Please request a new OTP.')
      } else if (error.code === 'auth/invalid-phone-number') {
        throw new Error('Invalid phone number')
      }

      throw new Error(error.message || 'OTP verification failed')
    }
  }

  /**
   * Clean up reCAPTCHA verifier
   */
  cleanupRecaptcha() {
    if (this.recaptchaVerifier) {
      try {
        this.recaptchaVerifier.clear()
        this.recaptchaVerifier = null
      } catch (error) {
        console.warn('Error clearing reCAPTCHA:', error)
      }
    }
  }

  /**
   * Clear stored phone authentication state
   */
  clearState() {
    this.phoneNumber = null
    this.confirmationResult = null
    this.cleanupRecaptcha()
  }
}

export const phoneAuth = new PhoneAuthService()
export default PhoneAuthService
