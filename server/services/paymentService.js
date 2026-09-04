import crypto from 'node:crypto'
import Razorpay from 'razorpay'

export function getRazorpay() {
  if (process.env.PAYMENT_PROVIDER !== 'razorpay' || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
}

export function verifyRazorpaySignature(orderId, paymentId, signature) {
  const digest = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex')
  const expected = Buffer.from(digest)
  const actual = Buffer.from(String(signature || ''))
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

export function getPaymentProvider() {
  return { name: process.env.PAYMENT_PROVIDER === 'razorpay' ? 'razorpay' : 'manual', configured: Boolean(getRazorpay()) }
}

export function paymentStatusFor(method) {
  if (process.env.PAYMENT_TEST_FAILURE === 'true' && method !== 'cash') return 'failed'
  return method === 'cash' ? 'pending' : 'success'
}
