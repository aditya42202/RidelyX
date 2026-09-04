import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import Payment from '../models/Payment.js'
import Ride from '../models/Ride.js'
import mongoose from 'mongoose'
import { store } from '../store.js'
import { getPaymentProvider, paymentStatusFor } from '../services/paymentService.js'

const router = express.Router()
router.use(requireAuth)

router.post('/', async (req, res, next) => {
  try {
    const { rideId, method } = req.body
    if (!rideId || !['upi', 'card', 'wallet', 'cash', 'ridepass'].includes(method)) return res.status(400).json({ message: 'Ride and valid payment method are required' })
    const ride = mongoose.connection.readyState === 1 ? await Ride.findOne({ _id: rideId, customer: req.auth.id }) : store.rides.find((item) => item._id === rideId && item.customer === req.auth.id)
    if (!ride) return res.status(404).json({ message: 'Ride not found' })
    const paymentData = { ride: ride._id, customer: req.auth.id, amount: ride.fare, method, status: paymentStatusFor(method), provider: getPaymentProvider().name, createdAt: new Date() }
    const payment = mongoose.connection.readyState === 1 ? await Payment.create(paymentData) : { _id: `payment-${Date.now()}`, ...paymentData }
    if (mongoose.connection.readyState !== 1) store.payments.push(payment)
    ride.paymentMethod = method
    ride.paymentStatus = payment.status
    if (ride.save) await ride.save()
    if (payment.status === 'failed') return res.status(402).json({ message: 'Payment failed. Please retry or choose another payment method.', payment })
    res.status(201).json({ payment })
  } catch (error) { next(error) }
})

router.get('/', async (req, res, next) => {
  try { res.json(mongoose.connection.readyState === 1 ? await Payment.find({ customer: req.auth.id }).sort({ createdAt: -1 }) : store.payments.filter((item) => item.customer === req.auth.id)) } catch (error) { next(error) }
})

export default router
