import { admin, isFirebaseConfigured } from '../config/firebaseAdmin.js'

/**
 * Verify Firebase ID token and extract user information
 * @param {string} idToken - Firebase ID token from frontend
 * @returns {Promise<{uid: string, phoneNumber: string, email: string}>}
 */
export async function verifyFirebaseToken(idToken) {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured on the backend')
  }

  try {
    if (!idToken || typeof idToken !== 'string') {
      throw new Error('Invalid ID token format')
    }

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken)

    // Extract verified phone number and other user info from token
    const phoneNumber = decodedToken.phone_number || null
    const email = decodedToken.email || null
    const uid = decodedToken.uid

    if (!phoneNumber) {
      throw new Error('Phone number not verified in Firebase token')
    }

    return {
      uid,
      phoneNumber,
      email
    }
  } catch (error) {
    // Handle specific Firebase errors
    if (error.code === 'auth/id-token-expired') {
      throw new Error('Firebase token has expired. Please login again.')
    } else if (error.code === 'auth/invalid-id-token') {
      throw new Error('Invalid Firebase token')
    } else if (error.code === 'auth/id-token-revoked') {
      throw new Error('Firebase token has been revoked')
    }

    throw error
  }
}

/**
 * Middleware to verify Firebase token in request
 * Extracts firebase user info and stores in req.firebase
 */
export function verifyFirebaseAuth(req, res, next) {
  const idToken = req.headers.authorization?.replace('Bearer ', '') || req.body.idToken

  if (!idToken) {
    return res.status(401).json({ success: false, message: 'Firebase ID token required' })
  }

  verifyFirebaseToken(idToken)
    .then((firebaseUser) => {
      req.firebase = firebaseUser
      next()
    })
    .catch((error) => {
      res.status(401).json({ 
        success: false, 
        message: error.message || 'Firebase token verification failed'
      })
    })
}

export default { verifyFirebaseToken, verifyFirebaseAuth }
