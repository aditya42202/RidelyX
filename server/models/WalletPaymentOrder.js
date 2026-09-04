import mongoose from 'mongoose'

const walletPaymentOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 200 },
  currency: { type: String, default: 'INR' },
  provider: { type: String, enum: ['razorpay'], default: 'razorpay' },
  razorpayOrderId: { type: String, required: true, unique: true, index: true },
  razorpayPaymentId: { type: String, unique: true, sparse: true, index: true },
  status: { type: String, enum: ['created', 'pending', 'captured', 'failed'], default: 'created' },
}, { timestamps: true })

export default mongoose.model('WalletPaymentOrder', walletPaymentOrderSchema)