# Firebase Phone OTP Integration - Technical Reference

## Architecture Overview

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AuthPanel.jsx                                              │
│    ↓ mode='phone'                                           │
│    ↓                                                         │
│  PhoneOtpLogin.jsx (311 lines)                             │
│    ├─ Phone Input Step                                     │
│    │   └─ phoneAuthService.sendOTP()                       │
│    │       ├─ Firebase reCAPTCHA verification              │
│    │       └─ Firebase signInWithPhoneNumber()             │
│    │                                                        │
│    ├─ OTP Verification Step                               │
│    │   └─ phoneAuthService.verifyOTP()                     │
│    │       └─ Firebase confirmationResult.confirm()        │
│    │           └─ Returns: { idToken, user }               │
│    │                                                        │
│    └─ Registration Step (New Users)                        │
│        └─ api.firebasePhoneRegister(idToken, ...)          │
│                                                              │
│  phoneAuthService.js (192 lines)                            │
│    ├─ Singleton pattern                                    │
│    ├─ Firebase auth instance                               │
│    ├─ reCAPTCHA verifier management                        │
│    └─ Confirmation result storage                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │
         │ HTTP POST /api/auth/firebase-phone
         │ { idToken: "..." }
         │
         ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Express)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  auth.js routes                                             │
│    POST /api/auth/firebase-phone                           │
│    │                                                        │
│    ├─ Validate Request                                    │
│    ├─ Call firebaseAuth.verifyFirebaseToken()             │
│    │   └─ Admin SDK verifies signature                    │
│    │   └─ Extracts: uid, phoneNumber, email               │
│    │                                                       │
│    ├─ Normalize Phone Number                             │
│    │   └─ Format: +91XXXXXXXXXX                          │
│    │                                                       │
│    ├─ Query MongoDB                                       │
│    │   └─ Find by mobile/firebaseUid                      │
│    │                                                       │
│    ├─ If Exists:                                          │
│    │   ├─ Link Firebase UID if needed                    │
│    │   ├─ Generate JWT token                             │
│    │   └─ Return { success: true, user }                 │
│    │                                                       │
│    └─ If Not Exists:                                      │
│        └─ Return { requiresRegistration: true }           │
│                                                              │
│    POST /api/auth/firebase-phone-register                 │
│    │                                                        │
│    ├─ Verify Firebase Token                              │
│    ├─ Extract Phone Number                               │
│    ├─ Check Phone Uniqueness                             │
│    ├─ Generate Temporary Email                           │
│    ├─ Create User in MongoDB                             │
│    │   ├─ Set: firebaseUid, phoneVerified                │
│    │   ├─ Generate random password                       │
│    │   └─ Set role (customer/partner)                    │
│    ├─ Generate JWT                                        │
│    └─ Return { success: true, user }                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────┐
│                 FIREBASE & DATABASE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Firebase Authentication                                    │
│    ├─ Stores: Phone number (verified)                      │
│    ├─ Stores: Firebase UID                                 │
│    ├─ Stores: Custom claims (if any)                       │
│    └─ SMS OTP delivery via Twilio                          │
│                                                              │
│  MongoDB - User Collection                                  │
│    ├─ _id                                                   │
│    ├─ name                                                  │
│    ├─ mobile (existing field, now linked to Firebase)      │
│    ├─ firebaseUid (NEW - unique, sparse)                   │
│    ├─ phoneVerified (NEW - boolean)                        │
│    ├─ email                                                │
│    ├─ password (hashed)                                    │
│    ├─ role (customer/partner)                              │
│    └─ ... other fields                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Frontend: phoneAuthService.js

**Purpose**: Encapsulates all Firebase phone authentication logic

**Public Interface**:
```javascript
phoneAuth.sendOTP(phoneNumber, recaptchaContainerId)
  → Promise<void>
  → Side effects: Sets this.confirmationResult

phoneAuth.verifyOTP(otpCode)
  → Promise<{ idToken, user }>

phoneAuth.initializeRecaptcha(containerId)
  → Promise<void>

phoneAuth.cleanupRecaptcha()
  → void

phoneAuth.clearState()
  → void
```

**State Management**:
```javascript
confirmationResult    // From Firebase - used to verify OTP
phoneNumber           // Formatted phone number
verificationAttempts  // Track attempts for UX
```

**Error Handling** - Maps Firebase error codes to user messages:
```
'invalid-phone-number'        → "Invalid phone number"
'too-many-requests'          → "Too many attempts, try later"
'operation-not-allowed'      → "Phone auth not enabled"
'invalid-verification-code'  → "Invalid OTP code"
'code-expired'               → "OTP has expired"
```

**Key Methods**:

1. **validateIndianPhoneNumber(phoneNumber)**
   - Regex: `/^[6-9]\d{9}$/`
   - Returns: boolean
   - Purpose: Client-side validation before sending to Firebase

2. **formatPhoneNumber(phoneNumber)**
   - Input: "9876543210" or "9876543210" or "+919876543210"
   - Output: "+919876543210"
   - Returns: null if invalid

3. **sendOTP(phoneNumber, recaptchaContainerId)**
   - Calls: `signInWithPhoneNumber(phoneNumber, appVerifier)`
   - Returns: Promise resolving to void
   - Side effect: Sets `this.confirmationResult`
   - Errors: Firebase error codes

4. **verifyOTP(otpCode)**
   - Calls: `this.confirmationResult.confirm(otpCode)`
   - Returns: Promise with `{ idToken, user }`
   - Throws: Firebase error if invalid
   - Note: idToken must be sent to backend for verification

---

### 2. Frontend: PhoneOtpLogin.jsx

**Purpose**: Complete UI component for phone authentication

**Props**:
```javascript
{
  onAuthenticated: Function,     // Called after successful login/register
  error: string,                 // Error message to display
  setError: Function,            // Set error message
  onBack: Function               // Back button handler
}
```

**Internal State**:
```javascript
step:                   // 'phone' | 'otp' | 'register'
phoneNumber:           // User input (10 digits)
otp:                   // User input (6 digits)
name:                  // User input (for registration)
role:                  // 'customer' | 'partner'
loading:               // Boolean
resentCooldown:        // Seconds until resend enabled
idToken:               // From Firebase OTP verification
firebaseUser:          // From backend (new user case)
```

**Render Paths**:

**Step 1: Phone Entry**
```
Enter 10-digit number (shows as +91 XXXXX XXXXX)
↓
reCAPTCHA widget loads
↓
Send OTP button
```

**Step 2: OTP Verification**
```
Enter 6-digit OTP from SMS
↓
Loading while verifying
↓
Verify OTP button
Resend OTP button (60s cooldown)
Back button
```

**Step 3: Registration (New Users Only)**
```
Enter name (max 80 chars)
↓
Select role: Customer or Partner
↓
Create Account button
```

**Key Features**:
- Phone formatting: Real-time display as "+91 XXXXX XXXXX"
- OTP field: Auto-focuses, accepts digits only
- Error messages: Specific Firebase error mapping
- Loading states: Buttons disabled during API calls
- Cooldown timer: 60 seconds before allowing resend
- Cleanup: reCAPTCHA cleaned up on unmount
- Accessibility: ARIA labels and roles for screen readers

**Integration Points**:
```javascript
// Calls phoneAuthService
await phoneAuth.sendOTP(formattedPhone, 'recaptcha-container')
await phoneAuth.verifyOTP(otpCode)

// Calls API
api.firebasePhoneLogin(idToken)           // For existing users
api.firebasePhoneRegister(idToken, ...)   // For new users
```

---

### 3. Backend: firebaseAdmin.js

**Purpose**: Initialize Firebase Admin SDK for token verification

**Initialization**:
```javascript
const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY
    .replace(/\\n/g, '\n'),  // Critical: Parse escaped newlines
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})
```

**Key Feature**: Private key parsing
- Environment variables store `\n` as literal characters
- Must convert `\\n` → `\n` for PEM format
- Critical for initialization

**Exports**:
```javascript
module.exports = {
  isFirebaseConfigured: boolean,
  // If true: Firebase initialized successfully
  // If false: Missing credentials; graceful degradation
  
  admin: admin instance (if configured)
}
```

---

### 4. Backend: firebaseAuth.js

**Purpose**: Middleware for verifying Firebase tokens

**Key Middleware**: `verifyFirebaseAuth(req, res, next)`
```javascript
// Usage in routes:
router.post('/api/auth/firebase-phone',
  verifyFirebaseAuth,   // Middleware
  firebasePhoneLoginController
)
```

**Verification Process**:
```javascript
const decodedToken = await admin.auth().verifyIdToken(idToken)
// Returns: {
//   iss, sub, aud, iat, exp,
//   firebase: {
//     identities: { phone_number: ["+911234567890"] },
//     sign_in_provider: "phone"
//   },
//   uid: "firebase_uid_..."
// }

const verified = {
  uid: decodedToken.uid,
  phoneNumber: decodedToken.phone_number,
  email: decodedToken.email || null
}
```

**Security Notes**:
- Token verified cryptographically
- Expiry checked automatically
- Phone number extracted from verified token (not client input)
- Error on missing phone (security: must be Firebase-verified)

**Error Handling**:
```javascript
'auth/invalid-id-token'      → 400 Bad Request
'auth/id-token-expired'      → 401 Unauthorized
'auth/argument-error'        → 400 Bad Request
// All other errors          → 503 Service Unavailable
```

---

### 5. Backend: auth.js Endpoints

**Endpoint 1: POST /api/auth/firebase-phone**

**Request**:
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMyJ9..."
}
```

**Response - Existing User** (200):
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+911234567890",
    "role": "customer",
    "walletBalance": 100,
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

**Response - New User** (404):
```json
{
  "success": false,
  "requiresRegistration": true,
  "firebaseUser": {
    "uid": "firebase_uid_abc123",
    "phoneNumber": "+911234567890",
    "email": "user@example.com"
  }
}
```

**Implementation**:
```javascript
1. verifyFirebaseToken(idToken)
2. Normalize phone to +91XXXXXXXXXX format
3. Query MongoDB:
   - Find by mobile (existing phone field)
   - OR find by firebaseUid (if already registered with Firebase)
4. If found:
   - Link firebaseUid if not linked
   - Generate JWT token
   - Set JWT cookie
   - Return user
5. If not found:
   - Return 404 with registration signal
   - Include firebaseUser data for UI
```

**Endpoint 2: POST /api/auth/firebase-phone-register**

**Request**:
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMyJ9...",
  "name": "Jane Doe",
  "role": "partner"
}
```

**Response** (201):
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Jane Doe",
    "phone": "+911234567890",
    "role": "partner",
    "email": "phone-1693567890123@ridex.phone",
    "walletBalance": 0,
    "kycStatus": "pending",
    "createdAt": "2026-08-30T12:00:00Z"
  }
}
```

**Implementation**:
```javascript
1. verifyFirebaseToken(idToken)
2. Extract phone from verified token
3. Check phone uniqueness in MongoDB
   - If exists: 409 Conflict
4. Generate temporary email:
   - Format: `phone-{timestamp}@ridex.phone`
   - Required because User schema requires email
5. Generate random password (bcryptjs)
6. Create User document with:
   - firebaseUid: verified Firebase UID
   - phoneVerified: true
   - phone/mobile: verified phone number
   - role: customer or partner (no auto-admin)
7. Generate JWT token
8. Set JWT cookie
9. Return 201 with user
```

**Important Note on Partners**:
- Role 'partner' doesn't bypass KYC
- Partners still need KYC review
- Account type just determines initial dashboard shown
- KYC status tracked separately in model

---

### 6. Database Schema Changes

**User Model Updates**:
```javascript
firebaseUid: {
  type: String,
  unique: true,
  sparse: true,
  // Unique but allows multiple null values
  // Required for backwards compatibility
  // Existing users have null
}

phoneVerified: {
  type: Boolean,
  default: false,
  // True if registered via Firebase phone auth
  // False for existing/email-based users
}

// Existing field (enhanced):
mobile: {
  type: String,
  // Now also used for Firebase phone users
  // Format: +91XXXXXXXXXX
  // Sparse unique index ensures no duplicates
}
```

**Index Configuration**:
```javascript
// Existing index (keep):
db.users.createIndex({ mobile: 1 }, { unique: true, sparse: true })

// New index:
db.users.createIndex({ firebaseUid: 1 }, { unique: true, sparse: true })

// Query patterns optimized:
// 1. Find existing user by phone:
User.findOne({ mobile: phone })

// 2. Link Firebase UID:
User.findByIdAndUpdate(id, { firebaseUid: uid })

// 3. Prevent duplicate phone:
User.findOne({ mobile: phone })  // Check before creating
```

---

## API Request/Response Flow

### Complete Flow Diagram

```
USER ACTION                    FRONTEND                    BACKEND
    │
    ├─→ Enters phone
        │
        └→ Click "Send OTP"
           │
           ├─→ phoneAuth.sendOTP()
           │   ├─→ reCAPTCHA verify
           │   └─→ Firebase.signInWithPhoneNumber()
           │       └─→ SMS sent
           │
           └→ Show OTP input field
               │
               └─→ Enters OTP
                   │
                   └→ Click "Verify OTP"
                      │
                      ├─→ phoneAuth.verifyOTP()
                      │   └─→ Firebase.confirmationResult.confirm()
                      │       └─→ Get idToken
                      │
                      └─→ POST /api/auth/firebase-phone
                         │
                         │ {idToken}
                         ├──────────────────────────────→
                                                │
                                                ├─→ verifyFirebaseToken()
                                                │
                                                ├─→ Query MongoDB
                                                │
                                                ├─→ If exists:
                                                │   └─→ Link Firebase UID
                                                │   └─→ Generate JWT
                                                │   └─→ Set cookie
                                                │
                                                └─→ Return success/registration
                         │
                         ←──────────────────────────────
                         │
                      ┌──┴──┐
                      │     │
                   exists  new
                      │     │
              Redirect │     └─→ Show registration form
              to dash- │
              board    ├─→ User enters name, role
                       │
                       └─→ POST /api/auth/firebase-phone-register
                          │
                          │ {idToken, name, role}
                          ├──────────────────────────────→
                                                │
                                                ├─→ verifyFirebaseToken()
                                                ├─→ Check uniqueness
                                                ├─→ Create user
                                                ├─→ Generate JWT
                                                ├─→ Set cookie
                                                │
                                                └─→ Return success
                          │
                          ←──────────────────────────────
                          │
                          └─→ Redirect to dashboard
```

---

## Error Handling Strategy

### Frontend Error Mapping

**Firebase Error Codes → User Messages**:
```javascript
{
  'invalid-phone-number': 'Please enter a valid phone number',
  'too-many-requests': 'Too many attempts. Try again later',
  'operation-not-allowed': 'Phone authentication is not enabled',
  'invalid-verification-code': 'Invalid OTP code. Please try again',
  'code-expired': 'OTP has expired. Please request a new one',
  'network-request-failed': 'Network error. Check your connection',
  'user-disabled': 'This user account has been disabled'
}
```

**API Error Codes → User Messages**:
```javascript
400: 'Invalid request. Please check your input',
401: 'Authentication failed. Please try again',
409: 'This phone number is already registered',
503: 'Service temporarily unavailable. Try again later'
```

### Backend Error Handling

**Firebase Admin SDK**:
```javascript
try {
  const decodedToken = await admin.auth().verifyIdToken(idToken)
} catch (error) {
  if (error.code === 'auth/invalid-id-token') {
    return res.status(400).json({ error: 'Invalid token' })
  } else if (error.code === 'auth/id-token-expired') {
    return res.status(401).json({ error: 'Token expired' })
  } else {
    return res.status(503).json({ error: 'Firebase service error' })
  }
}
```

**MongoDB Operations**:
```javascript
try {
  const user = await User.create({ phone, firebaseUid, ... })
} catch (error) {
  if (error.code === 11000) {  // Duplicate key
    return res.status(409).json({ error: 'Phone already registered' })
  }
  throw error
}
```

---

## Security Considerations

### Threat Model

1. **Attacker tries to use someone else's phone number**
   - ✅ Prevention: Firebase requires SMS OTP verification
   - ✅ Prevention: Server trusts Firebase-verified phone only

2. **Attacker tries to forge Firebase token**
   - ✅ Prevention: Firebase Admin SDK verifies cryptographic signature
   - ✅ Prevention: Token expiry (1 hour default)

3. **Attacker tries to bypass Firebase verification**
   - ✅ Prevention: Phone number extracted from verified token, not client input
   - ✅ Prevention: Backend always verifies before trusting

4. **Attacker tries to spam OTP requests**
   - ✅ Prevention: Firebase rate limits OTP requests (~5 per 15 min)
   - ✅ Prevention: reCAPTCHA protects frontend
   - ✅ Prevention: Frontend enforces 60s resend cooldown

5. **Attacker intercepts JWT tokens**
   - ✅ Prevention: HTTPS required in production
   - ✅ Prevention: HttpOnly cookies prevent JavaScript access
   - ✅ Prevention: CSRF token if not using SameSite cookies

### Production Security Checklist

- [ ] HTTPS enforced on all endpoints
- [ ] Firebase private key in secure vault (AWS Secrets Manager, etc.)
- [ ] `.env` file never committed to Git
- [ ] Environment variables validated on startup
- [ ] Rate limiting implemented on auth endpoints
- [ ] Monitoring alerts for failed auth attempts
- [ ] No sensitive data logged (tokens, phone numbers)
- [ ] CORS configured to allow only your domains

---

## Performance Optimization

### Database Queries

```javascript
// Good: Indexed query
User.findOne({ mobile: '+911234567890' })  // Fast (indexed)

// Good: Indexed query with projection
User.findOne(
  { mobile: '+911234567890' },
  'name email role'  // Don't fetch unnecessary fields
)

// Bad: No index
User.find({ firebaseUid: '...' })  // Slower without index

// Solution: Ensure indexes exist
db.users.createIndex({ mobile: 1 }, { unique: true, sparse: true })
db.users.createIndex({ firebaseUid: 1 }, { unique: true, sparse: true })
```

### Firebase Token Verification

```javascript
// Token verification takes ~50-100ms
// Results are NOT cached (stateless design)
// Each request verifies independently

// For high throughput:
// - Use connection pooling (already configured in Mongoose)
// - Implement Redis cache for user lookups (optional enhancement)
// - Monitor Firebase quota usage
```

### Frontend Performance

```javascript
// reCAPTCHA loading: ~200-500ms
// Firebase SDK already loaded: ~1-2MB (cached after first use)
// OTP send: 3-5s (Firebase SMS delivery)
// OTP verify: 2-3s (Firebase + backend processing)

// Optimization: Lazy load Firebase components if not immediately needed
```

---

## Debugging Guide

### Enable Debug Logging

**Frontend**:
```javascript
// In phoneAuthService.js, uncomment:
console.log('Firebase phone auth:', error)
```

**Backend**:
```javascript
// In firebaseAdmin.js:
if (!isFirebaseConfigured) {
  console.warn('Firebase Admin SDK not configured')
}

// In auth routes:
console.log('Firebase phone login:', { phone, uid })
```

### Common Debug Scenarios

1. **"Firebase not initialized"**
   - Check: Environment variables loaded
   - Check: firebaseAdmin.js returns isFirebaseConfigured=true
   - Check: No errors in Firebase SDK init

2. **"Token verification failed"**
   - Check: Token is valid (not expired)
   - Check: Private key has correct newlines
   - Check: Project ID matches

3. **"Phone not found in database"**
   - Check: Phone format is +91XXXXXXXXXX
   - Check: Database has correct phone values
   - Check: Index on mobile field exists

---

## Future Enhancements

### Potential Improvements

1. **Multi-language Support**
   - Localize error messages
   - Localize UI text
   - Support multiple SMS providers for different regions

2. **WhatsApp OTP**
   - Alternative delivery method
   - Firebase supports WhatsApp integration

3. **Email Fallback**
   - If SMS fails, fallback to email OTP
   - Improve reliability

4. **Advanced Analytics**
   - Track auth flows
   - Monitor success rates
   - Identify bottlenecks

5. **Biometric Integration**
   - Store Firebase UID
   - Link to device biometrics
   - Faster future authentication

6. **Phone Number Validation**
   - Verify number is active/not ported
   - Check carrier information
   - Reduce fraud

---

## Maintenance

### Regular Tasks

**Weekly**:
- Check error logs for auth failures
- Monitor Firebase usage metrics
- Verify SMS delivery rates

**Monthly**:
- Review new user registration trends
- Check Firebase billing
- Review security advisories

**Quarterly**:
- Update Firebase SDKs
- Review and optimize auth flow
- Security audit

---

## Support Resources

- **Firebase Documentation**: https://firebase.google.com/docs/auth/phone-auth
- **Admin SDK Reference**: https://firebase.google.com/docs/reference/admin
- **Troubleshooting**: Check FIREBASE_SETUP.md section "Troubleshooting"

