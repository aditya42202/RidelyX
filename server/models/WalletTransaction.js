import mongoose from 'mongoose'

const walletTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['topup', 'ride_charge', 'refund', 'promotional_credit'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true, trim: true },
  razorpayOrderId: { type: String, index: true },
  razorpayPaymentId: { type: String, unique: true, sparse: true, index: true },
  paymentStatus: { type: String, enum: ['created', 'pending', 'captured', 'failed', 'refunded'], default: 'pending' },
  currency: { type: String, default: 'INR' },
  reference: String,
}, { timestamps: true })

export default mongoose.model('WalletTransaction', walletTransactionSchema)
