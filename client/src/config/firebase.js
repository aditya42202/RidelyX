import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
}

// Validate Firebase config
export const isFirebaseConfigured = Object.values(firebaseConfig).every(value => value && value.length > 0)

if (!isFirebaseConfigured) {
  if (import.meta.env.MODE === 'production') {
    console.error('❌ Firebase is not properly configured. Phone authentication will not work in production.')
  } else {
    console.warn('⚠️ Firebase environment variables not set. Phone auth will show "configuration-not-found" error.')
    console.warn('To enable: Set VITE_FIREBASE_* variables in .env file')
  }
}

let firebaseApp = null
let auth = null
try {
  firebaseApp = initializeApp(firebaseConfig)
  auth = getAuth(firebaseApp)
  if (isFirebaseConfigured) {
    console.log('✓ Firebase initialized successfully')
  }
} catch (error) {
  console.error('Firebase initialization error:', error.message)
  if (!isFirebaseConfigured) {
    console.log('This is expected if Firebase credentials are not configured yet.')
  }
}

export { auth }
export default firebaseApp
