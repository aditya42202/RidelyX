import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['flat', 'percentage'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minimumFare: { type: Number, default: 0 },
  maximumDiscount: Number,
  expiresAt: { type: Date, required: true },
  usageLimit: Number,
  usageCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.model('Coupon', couponSchema)
