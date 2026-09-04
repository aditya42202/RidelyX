import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import Coupon from '../models/Coupon.js'

const router = express.Router()
router.use(requireAuth)

router.post('/validate', async (req, res, next) => {
  try {
    const coupon = await Coupon.findOne({ code: String(req.body.code || '').toUpperCase(), isActive: true, expiresAt: { $gt: new Date() } })
    const fare = Number(req.body.fare)
    if (!coupon || !Number.isFinite(fare) || fare < coupon.minimumFare || (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)) return res.status(400).json({ message: 'Coupon is invalid or unavailable' })
    const discount = coupon.discountType === 'percentage' ? fare * coupon.discountValue / 100 : coupon.discountValue
    res.json({ code: coupon.code, discount: Math.min(discount, coupon.maximumDiscount || discount), finalFare: Math.max(0, fare - Math.min(discount, coupon.maximumDiscount || discount)) })
  } catch (error) { next(error) }
})

export default router
