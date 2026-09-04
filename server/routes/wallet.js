import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import User from '../models/User.js'
import WalletTransaction from '../models/WalletTransaction.js'
import WalletPaymentOrder from '../models/WalletPaymentOrder.js'
import { getRazorpay, verifyRazorpaySignature } from '../services/paymentService.js'

const router = express.Router()
const MIN_AMOUNT = 200
const MAX_AMOUNT = 100000

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.id).select('walletBalance')
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' })
    const transactions = await WalletTransaction.find({
      user: req.auth.id,
      $or: [{ type: { $ne: 'topup' } }, { paymentStatus: 'captured' }],
    }).sort({ createdAt: -1 })
    res.json({ success: true, balance: user.walletBalance || 0, currency: 'INR', transactions })
  } catch (error) { next(error) }
})

router.post('/create-order', requireAuth, async (req, res, next) => {
  try {
    const amount = Number(req.body.amount)
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) return res.status(400).json({ success: false, message: `Wallet recharge must be between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT}.` })
    const razorpay = getRazorpay()
    if (!razorpay) return res.status(503).json({ success: false, message: 'Razorpay is not configured.' })
    const order = await razorpay.orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt: `wallet_${req.auth.id}_${Date.now()}`, notes: { userId: String(req.auth.id) } })
    await WalletPaymentOrder.create({ user: req.auth.id, amount, razorpayOrderId: order.id })
    res.status(201).json({ success: true, data: { orderId: order.id, amount, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID } })
  } catch (error) { next(error) }
})

router.post('/verify-payment', requireAuth, async (req, res, next) => {
  try {
    const { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: signature } = req.body
    if (!paymentId || !orderId || !signature) return res.status(400).json({ success: false, message: 'Payment verification details are required.' })
    const order = await WalletPaymentOrder.findOne({ razorpayOrderId: orderId, user: req.auth.id })
    if (!order) return res.status(404).json({ success: false, message: 'Payment order not found.' })
    const razorpay = getRazorpay()
    if (!razorpay) return res.status(503).json({ success: false, message: 'Razorpay is not configured.' })
    if (order.status === 'captured' && order.razorpayPaymentId === paymentId) {
      const user = await User.findById(req.auth.id).select('walletBalance')
      return res.json({ success: true, message: 'Payment already verified.', balance: user.walletBalance })
    }
    if (!verifyRazorpaySignature(orderId, paymentId, signature)) return res.status(400).json({ success: false, message: 'Payment verification failed.' })
    const payment = await razorpay.payments.fetch(paymentId)
    if (payment.order_id !== orderId || payment.status !== 'captured' || payment.amount !== Math.round(order.amount * 100)) {
      return res.status(402).json({ success: false, message: 'Payment is not captured. Your wallet has not been charged.' })
    }
    const existing = await WalletTransaction.findOne({ razorpayPaymentId: paymentId })
    if (existing) {
      const user = await User.findById(req.auth.id).select('walletBalance')
      return res.json({ success: true, message: 'Payment already verified.', balance: user.walletBalance })
    }
    const claimedOrder = await WalletPaymentOrder.findOneAndUpdate(
      { _id: order._id, status: { $ne: 'captured' }, razorpayPaymentId: { $exists: false } },
      { $set: { razorpayPaymentId: paymentId, status: 'captured' } },
      { new: true },
    )
    if (!claimedOrder) {
      const user = await User.findById(req.auth.id).select('walletBalance')
      return res.json({ success: true, message: 'Payment already verified.', balance: user.walletBalance })
    }
    const user = await User.findByIdAndUpdate(req.auth.id, { $inc: { walletBalance: order.amount } }, { new: true }).select('walletBalance')
    if (!user) return res.status(404).json({ success: false, message: 'Account not found.' })
    await WalletTransaction.create({ user: req.auth.id, type: 'topup', amount: order.amount, description: 'Wallet recharge via Razorpay', razorpayOrderId: orderId, razorpayPaymentId: paymentId, paymentStatus: 'captured', currency: 'INR' })
    res.json({ success: true, message: `₹${order.amount} added to your RideX wallet successfully.`, balance: user.walletBalance })
  } catch (error) {
    if (error.code === 11000) return res.json({ success: true, message: 'Payment already verified.' })
    next(error)
  }
})

export default router
