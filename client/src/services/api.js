const request = async (path, options = {}) => {
  let response
  try {
    response = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers }, ...options })
  } catch {
    throw new Error('RideX server se connection nahi ho paaya. Server start karke dobara try karein.')
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const fallback = response.status >= 500
      ? 'RideX server mein temporary problem hai. Thodi der baad dobara try karein.'
      : `Request complete nahi ho paayi (error ${response.status}).`
    throw new Error(data.message || fallback)
  }
  return data
}

export const api = {
  health: () => request('/api/health'),
  me: () => request('/api/auth/me'),
  updateProfile: (payload) => request('/api/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  supportRequest: (category, message) => request('/api/auth/support', { method: 'POST', body: JSON.stringify({ category, message }) }),
  createServiceRequest: (type, details) => request('/api/requests', { method: 'POST', body: JSON.stringify({ type, details }) }),
  adminRequests: () => request('/api/requests/admin'),
  reviewRequest: (id, status) => request(`/api/requests/admin/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  login: (identifier, password, role) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password, role }) }),
  googleLogin: (email) => request('/api/auth/google', { method: 'POST', body: JSON.stringify({ email }) }),
  firebasePhoneLogin: (idToken) => request('/api/auth/firebase-phone', { method: 'POST', body: JSON.stringify({ idToken }) }),
  firebasePhoneRegister: (idToken, name, role) => request('/api/auth/firebase-phone-register', { method: 'POST', body: JSON.stringify({ idToken, name, role }) }),
  register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  forgotPassword: (email) => request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, password) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  requestOtp: (identifier) => request('/api/auth/otp/request', { method: 'POST', body: JSON.stringify({ identifier }) }),
  verifyOtp: (challengeId, code) => request('/api/auth/otp/verify', { method: 'POST', body: JSON.stringify({ challengeId, code }) }),
  quote: (city, destination, distance, duration) => request('/api/rides/quote', { method: 'POST', body: JSON.stringify({ city, destination, distance, duration }) }),
  bookRide: (payload) => request('/api/rides', { method: 'POST', body: JSON.stringify(payload) }),
  rides: () => request('/api/rides'),
  wallet: () => request('/api/wallet'),
  createWalletOrder: (amount) => request('/api/wallet/create-order', { method: 'POST', body: JSON.stringify({ amount }) }),
  verifyWalletPayment: (payload) => request('/api/wallet/verify-payment', { method: 'POST', body: JSON.stringify(payload) }),
  createPassOrder: (plan) => request('/api/pass/create-order', { method: 'POST', body: JSON.stringify({ plan }) }),
  verifyPassPayment: (payload) => request('/api/pass/verify-payment', { method: 'POST', body: JSON.stringify(payload) }),
  payments: () => request('/api/payments'),
  pay: (rideId, method) => request('/api/payments', { method: 'POST', body: JSON.stringify({ rideId, method }) }),
  validateCoupon: (code, fare) => request('/api/coupons/validate', { method: 'POST', body: JSON.stringify({ code, fare }) }),
  rateRide: (rideId, score, comment) => request('/api/ratings', { method: 'POST', body: JSON.stringify({ rideId, score, comment }) }),
  updateRideStatus: (rideId, status, otp) => request(`/api/rides/${rideId}/status`, { method: 'PATCH', body: JSON.stringify({ status, otp }) }),
  driver: () => request('/api/drivers/me'),
  driverProfile: (payload) => request('/api/drivers/profile', { method: 'POST', body: JSON.stringify(payload) }),
  driverKyc: (payload) => request('/api/drivers/kyc', { method: 'PATCH', body: JSON.stringify(payload) }),
  driverAvailability: (isOnline) => request('/api/drivers/availability', { method: 'PATCH', body: JSON.stringify({ isOnline }) }),
  driverLocation: (latitude, longitude) => request('/api/drivers/location', { method: 'PATCH', body: JSON.stringify({ latitude, longitude }) }),
  rideLocation: (rideId) => request(`/api/rides/${rideId}/location`),
  chatHistory: (rideId) => request(`/api/rides/${rideId}/chat`),
  sendChatMessage: (rideId, message) => request(`/api/rides/${rideId}/chat`, { method: 'POST', body: JSON.stringify({ message }) }),
  markChatRead: (rideId) => request(`/api/rides/${rideId}/chat/read`, { method: 'PATCH' }),
  driverRequests: () => request('/api/drivers/rides/requests'),
  driverActiveRide: () => request('/api/drivers/rides/active'),
  acceptRide: (rideId) => request(`/api/drivers/rides/${rideId}/accept`, { method: 'PATCH' }),
  rejectRide: (rideId) => request(`/api/drivers/rides/${rideId}/reject`, { method: 'PATCH' }),
  driverRideStatus: (rideId, status, otp) => request(`/api/drivers/rides/${rideId}/status`, { method: 'PATCH', body: JSON.stringify({ status, otp }) }),
  adminOverview: () => request('/api/admin/overview'),
  adminUsers: () => request('/api/admin/users'),
  notifications: () => request('/api/notifications'),
  markNotificationRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  adminDrivers: () => request('/api/admin/drivers'),
  verifyDriver: (id, status) => request(`/api/admin/drivers/${id}/verification`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  adminRides: () => request('/api/admin/rides'),
  adminPayments: () => request('/api/admin/payments'),
  adminCoupons: () => request('/api/admin/coupons'),
  createCoupon: (coupon) => request('/api/admin/coupons', { method: 'POST', body: JSON.stringify(coupon) }),
  updateCoupon: (id, changes) => request(`/api/admin/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
}
