import admin from 'firebase-admin'

// Parse Firebase private key - handle newlines correctly
const parsePrivateKey = (key) => {
  if (!key) return undefined
  return key.replace(/\\n/g, '\n')
}

const firebaseAdminConfig = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
}

// Check if Firebase Admin SDK is configured
const isFirebaseConfigured = firebaseAdminConfig.project_id && firebaseAdminConfig.private_key && firebaseAdminConfig.client_email

if (isFirebaseConfigured) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseAdminConfig)
    })
  } catch (error) {
    // Firebase Admin SDK might already be initialized
    if (!error.message.includes('already exists')) {
      console.error('Firebase Admin initialization error:', error.message)
    }
  }
}

export { admin, isFirebaseConfigured }
export default admin
