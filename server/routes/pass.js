import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import User from '../models/User.js'
import PassPaymentOrder from '../models/PassPaymentOrder.js'
import { getRazorpay, verifyRazorpaySignature } from '../services/paymentService.js'

const router = express.Router()
const plans = { Weekly: { amount: 99, days: 7 }, Monthly: { amount: 299, days: 30 }, Yearly: { amount: 2499, days: 365 } }

router.use(requireAuth)
router.get('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.id).select('passPlan passExpiresAt')
    res.json({ success: true, active: Boolean(user?.passExpiresAt && user.passExpiresAt > new Date()), plan: user?.passPlan, expiresAt: user?.passExpiresAt })
  } catch (error) { next(error) }
})

router.post('/create-order', async (req, res, next) => {
  try {
    const plan = plans[req.body.plan]
    if (!plan) return res.status(400).json({ success: false, message: 'Choose a valid RidePass plan.' })
    const razorpay = getRazorpay()
    if (!razorpay) return res.status(503).json({ success: false, message: 'Razorpay is not configured.' })
    const order = await razorpay.orders.create({ amount: plan.amount * 100, currency: 'INR', receipt: `pass_${req.auth.id}_${Date.now()}`, notes: { userId: String(req.auth.id), plan: req.body.plan } })
    await PassPaymentOrder.create({ user: req.auth.id, plan: req.body.plan, amount: plan.amount, razorpayOrderId: order.id })
    res.status(201).json({ success: true, data: { orderId: order.id, amount: plan.amount, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID } })
  } catch (error) { next(error) }
})

router.post('/verify-payment', async (req, res, next) => {
  try {
    const { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: signature } = req.body
    const order = await PassPaymentOrder.findOne({ razorpayOrderId: orderId, user: req.auth.id })
    if (!order || !paymentId || !signature) return res.status(400).json({ success: false, message: 'Payment verification details are required.' })
    if (order.status === 'captured' && order.razorpayPaymentId === paymentId) return res.json({ success: true, message: 'RidePass is already active.' })
    const razorpay = getRazorpay()
    if (!razorpay || !verifyRazorpaySignature(orderId, paymentId, signature)) return res.status(400).json({ success: false, message: 'Payment verification failed.' })
    const payment = await razorpay.payments.fetch(paymentId)
    if (payment.order_id !== orderId || payment.status !== 'captured' || payment.amount !== order.amount * 100) return res.status(402).json({ success: false, message: 'Payment is not captured. RidePass has not been activated.' })
    const claimed = await PassPaymentOrder.findOneAndUpdate({ _id: order._id, status: { $ne: 'captured' }, razorpayPaymentId: { $exists: false } }, { $set: { razorpayPaymentId: paymentId, status: 'captured' } }, { new: true })
    if (!claimed) return res.json({ success: true, message: 'RidePass is already active.' })
    const expiresAt = new Date(Date.now() + plans[order.plan].days * 24 * 60 * 60 * 1000)
    const user = await User.findByIdAndUpdate(req.auth.id, { passPlan: order.plan, passExpiresAt: expiresAt }, { new: true }).select('passPlan passExpiresAt')
    res.json({ success: true, message: `${order.plan} RidePass activated successfully.`, data: { plan: user.passPlan, expiresAt: user.passExpiresAt } })
  } catch (error) { next(error) }
})

export default router