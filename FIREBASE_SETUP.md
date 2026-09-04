# Firebase Phone OTP Integration - Setup Guide

## Overview

This guide explains how to set up and use Firebase Phone Number Authentication (SMS OTP) in the RIDEX project. The implementation allows users to sign in or register using their Indian mobile numbers with SMS-based OTP verification.

## Features Implemented

✅ Firebase Phone Number Authentication  
✅ SMS OTP Verification  
✅ reCAPTCHA Integration  
✅ Support for both Customers and Partners/Drivers  
✅ Existing User Login  
✅ New User Registration  
✅ Backend Firebase Token Verification  
✅ Seamless Integration with Existing JWT System  
✅ No Breaking Changes to Existing Auth Methods  

## Prerequisites

- Firebase Project (https://firebase.google.com/)
- MongoDB Database
- Node.js 14+ and npm
- React 19+

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name (e.g., "RIDEX")
4. Follow the setup wizard and create the project

### 1.2 Enable Phone Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click **Phone** provider
3. Toggle **Enable** to ON
4. Click **Save**

### 1.3 Configure reCAPTCHA Settings

1. In the same **Sign-in method** tab, scroll to **reCAPTCHA**
2. For development, reCAPTCHA v3 is recommended
3. Note: reCAPTCHA will automatically use your domain

### 1.4 Configure Authorized Domains

1. Go to **Authentication** → **Settings** tab
2. Scroll to **Authorized domains**
3. Add your domains:
   - **Development**: `localhost` (usually auto-added)
   - **Production**: Your actual domain (e.g., `ridex.app`)

### 1.5 SMS Providers Configuration (Optional for Advanced Setup)

For production, configure SMS provider:
1. Go to **Authentication** → **Settings** → **SMS Region**
2. Configure region policies if needed (Firebase uses Twilio by default)

## Step 2: Backend Setup

### 2.1 Firebase Admin SDK Credentials

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Click **Service Accounts** tab
3. Click **Generate New Private Key**
4. A JSON file will download - **Keep this safe!**

Example structure of the downloaded JSON:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id"
}
```

### 2.2 Set Backend Environment Variables

Create or update `.env` file in the project root:

```env
# Firebase Admin SDK Credentials
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
```

**⚠️ IMPORTANT SECURITY NOTES:**
- **NEVER commit `.env` file to Git**
- Private Key must have `\n` properly escaped for newlines
- In environment variables, use actual newlines, not `\n` escape sequences
- Use a `.env.local` file for local development

### 2.3 Backend Files Created/Modified

**New Files:**
- `server/config/firebaseAdmin.js` - Firebase Admin SDK initialization
- `server/middleware/firebaseAuth.js` - Firebase token verification middleware

**Modified Files:**
- `server/models/User.js` - Added `firebaseUid` and `phoneVerified` fields
- `server/routes/auth.js` - Added `/firebase-phone` and `/firebase-phone-register` endpoints

### 2.4 Verify Backend Setup

Test Firebase Admin SDK initialization:
```bash
npm run server
# Check console for Firebase initialization messages
```

## Step 3: Frontend Setup

### 3.1 Set Frontend Environment Variables

Create or update `.env` in the `client/` directory:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

**How to Get These Values:**

1. In Firebase Console, click the Web App button (</> icon)
2. Copy the config object
3. The values are clearly labeled in the config

Example Firebase config:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "ridex-12345.firebaseapp.com",
  projectId: "ridex-12345",
  storageBucket: "ridex-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef"
};
```

### 3.2 Frontend Files Created/Modified

**New Files:**
- `client/src/config/firebase.js` - Firebase app initialization
- `client/src/services/phoneAuthService.js` - Phone OTP service logic
- `client/src/components/PhoneOtpLogin.jsx` - Phone OTP UI component

**Modified Files:**
- `client/src/services/api.js` - Added Firebase phone auth API methods
- `client/src/components/AuthPanel.jsx` - Integrated PhoneOtpLogin component
- `client/src/auth.css` - Added phone auth component styles

### 3.3 Verify Frontend Setup

```bash
cd client
npm run dev
# Open http://localhost:5173
# You should see "Sign in with mobile" option on login page
```

## Step 4: Verify Environment Variables in Root .env

Update the main `.env` file with all required variables:

```env
# Existing variables...
PORT=4000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-jwt-secret

# Firebase Frontend (VITE_* prefix is important!)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Firebase Backend (Admin SDK)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
```

## Complete Authentication Flow

### Login Flow (Existing User)

```
User clicks "Sign in with mobile"
↓
Enters 10-digit Indian mobile number
↓
Firebase sends SMS OTP
↓
User enters 6-digit OTP
↓
Firebase verifies OTP → generates ID token
↓
Frontend sends ID token to backend
↓
Backend verifies ID token using Firebase Admin SDK
↓
Backend checks MongoDB for user by phone/Firebase UID
↓
FOUND → Generate JWT token → Login
↓
User redirected to dashboard based on role
```

### Registration Flow (New User)

```
User with new phone number completes OTP verification
↓
Backend detects new user (not found in MongoDB)
↓
User enters name and selects account type
↓
User clicks "Create Account"
↓
Backend generates random password
↓
User created in MongoDB with:
  - firebaseUid (linked to Firebase)
  - phoneVerified: true
  - phone/mobile number
↓
JWT token generated
↓
Redirected to profile completion or dashboard
```

## API Endpoints

### POST `/api/auth/firebase-phone`

**Purpose**: Login an existing user with Firebase phone OTP

**Request Body**:
```json
{
  "idToken": "firebase_id_token_from_frontend"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "+911234567890",
    "role": "customer",
    "walletBalance": 100
  }
}
```

**New User Response** (404):
```json
{
  "success": false,
  "requiresRegistration": true,
  "firebaseUser": {
    "uid": "firebase_uid",
    "phoneNumber": "+911234567890",
    "email": "user@example.com"
  }
}
```

### POST `/api/auth/firebase-phone-register`

**Purpose**: Register a new user with Firebase phone OTP

**Request Body**:
```json
{
  "idToken": "firebase_id_token_from_frontend",
  "name": "John Doe",
  "role": "customer"  // or "partner"
}
```

**Success Response** (201):
```json
{
  "success": true,
  "user": {
    "id": "newly_created_user_id",
    "name": "John Doe",
    "phone": "+911234567890",
    "role": "customer",
    "walletBalance": 0
  }
}
```

**Error Responses**:
- `400`: Invalid request or Firebase token verification failed
- `409`: Phone number already registered
- `503`: Firebase not configured on backend

## Testing

### Manual Testing Steps

#### Test 1: Send OTP

1. Open RIDEX app
2. Click "Sign in with mobile" or navigate to phone auth
3. Enter a valid 10-digit Indian mobile number (e.g., `9876543210`)
4. Click "Send OTP"
5. ✅ You should receive an SMS with 6-digit OTP

#### Test 2: Verify OTP - New User

1. After sending OTP, enter the 6-digit code
2. On new user detection, enter name and select account type
3. Click "Create Account"
4. ✅ Account should be created and you'll be logged in

#### Test 3: Verify OTP - Existing User

1. If phone number already exists in database
2. After OTP verification, you'll be logged in directly
3. ✅ Redirected to appropriate dashboard

#### Test 4: OTP Expiry

1. Send OTP
2. Wait 10 minutes without verifying
3. Try to verify OTP
4. ✅ Should show "OTP has expired" error

#### Test 5: Resend OTP

1. Send OTP
2. Click "Resend OTP" button immediately
3. ✅ Button should show 60-second cooldown
4. Wait 60 seconds
5. ✅ Button becomes clickable again

#### Test 6: Invalid OTP

1. Send OTP
2. Enter wrong 6-digit code
3. Click "Verify"
4. ✅ Should show "Invalid OTP" error

#### Test 7: Existing Auth Methods Still Work

1. Test Email + Password login ✅
2. Test Email OTP login ✅
3. Test Google Login ✅
4. All existing methods should work unchanged

### Test Accounts

For testing, you can use test phone numbers in Firebase console:

1. Go to **Authentication** → **Settings**
2. Scroll to **Testing in development**
3. Add test phone numbers (e.g., `+91-9876543210`)
4. Firebase will auto-verify these numbers

## MongoDB Schema Updates

### User Model Changes

New fields added to User schema:

```javascript
firebaseUid: {
  type: String,
  unique: true,
  sparse: true  // Allows null values; won't index null
}

phoneVerified: {
  type: Boolean,
  default: false
}
```

**Important Notes:**
- Existing users without Firebase UID will have `firebaseUid: null`
- `sparse: true` ensures no duplicate null issues
- Existing authentication methods remain unaffected
- Phone field already existed; now used for Firebase integration

## Security Best Practices

### For Production Deployment

✅ **Do:**
- Use HTTPS only (Firebase requires secure context)
- Store Firebase private key in secure vault (AWS Secrets Manager, HashiCorp Vault)
- Implement rate limiting on auth endpoints
- Enable Firebase Security Rules
- Monitor Firebase usage in console
- Regularly rotate Firebase credentials

❌ **Don't:**
- Commit `.env` files to Git
- Expose Firebase Admin credentials in frontend code
- Trust phone numbers sent directly from frontend
- Allow users to manually set their Firebase UID
- Log sensitive tokens in production

### Environment Variables Security

For production, use environment management:

**AWS Lambda/EC2**:
```bash
aws ssm put-parameter --name "firebase-private-key" --value "..." --type SecureString
```

**Heroku**:
```bash
heroku config:set FIREBASE_PRIVATE_KEY="..."
```

**Docker**:
```dockerfile
ENV FIREBASE_PRIVATE_KEY_ID=${FIREBASE_PRIVATE_KEY_ID}
```

## Troubleshooting

### "Firebase is not configured" Error

**Problem**: Phone auth button doesn't work or shows "not configured" error

**Solution**:
1. Verify all `VITE_FIREBASE_*` env vars are set in `.env`
2. Restart dev server: `npm run dev`
3. Check browser console for Firebase initialization errors
4. Ensure Firebase Web App is created in Firebase Console

### "reCAPTCHA initialization failed"

**Problem**: reCAPTCHA widget won't load

**Solution**:
1. Ensure domain is authorized in Firebase console
2. For localhost: Usually auto-authorized; if not, add manually
3. Check browser console for detailed error message
4. Verify HTTPS in production (reCAPTCHA requires secure context)

### "Phone number not verified in Firebase token"

**Problem**: Backend rejects phone OTP despite frontend accepting it

**Solution**:
1. Verify Firebase Phone auth is enabled in console
2. Check that user entered phone number correctly (+91 format)
3. Ensure test phone numbers are registered if in testing mode
4. Check Firebase Security Rules are not blocking access

### MongoDB Duplicate Key Error

**Problem**: "E11000 duplicate key error" on phone field

**Solution**:
1. Existing phone data might not be in correct format
2. Manually fix phone numbers in MongoDB to `+91XXXXXXXXXX` format
3. Or recreate indexes: `db.users.collection.dropIndex("mobile_1")`

### "Too many OTP requests" Error

**Problem**: Firebase rate limits OTP requests

**Solution**:
1. Wait ~1 minute before requesting new OTP
2. Frontend shows 60-second cooldown; respect it
3. This is a security feature - don't bypass

## Additional Notes

### Database Backward Compatibility

- Existing users (without phone auth) remain unaffected
- Email-based login continues to work
- Phone field is optional (sparse index allows nulls)
- No data migration needed for existing users

### Integration with Existing Features

- Newly registered phone users can use all existing features:
  - Wallet payments
  - Pass subscriptions
  - Ride ratings
  - Safety features
  - Admin dashboard (if registered as admin)

### Multi-Language Support

The component uses existing i18n patterns but currently supports English. To add Hindi/other languages, update:
- `client/src/components/PhoneOtpLogin.jsx`
- `client/src/services/phoneAuthService.js`
- Error messages in API responses

## Support and Updates

For Firebase-specific issues:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Community](https://stackoverflow.com/questions/tagged/firebase)

For RIDEX-specific integration issues:
- Check this guide's Troubleshooting section
- Review implementation files in `server/config/` and `client/src/services/`
- Check MongoDB user documents for `firebaseUid` and `phoneVerified` fields

## Production Checklist

Before deploying to production:

- [ ] All Firebase environment variables configured
- [ ] Firebase Console authorized domains includes production URL
- [ ] MongoDB indexes verified (`mobile`, `firebaseUid`)
- [ ] HTTPS enabled on production domain
- [ ] Firebase Security Rules configured
- [ ] Rate limiting implemented on auth endpoints
- [ ] Error logging configured
- [ ] Firebase Admin SDK credentials secured in vault
- [ ] `.env` file excluded from Git (.gitignore)
- [ ] SMS providers configured if needed
- [ ] User registration email notifications set up
- [ ] Admin notification for new phone-based registrations
- [ ] Tested on multiple devices (iOS, Android, Web)

