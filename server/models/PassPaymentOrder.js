import mongoose from 'mongoose'

const passPaymentOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: String, enum: ['Weekly', 'Monthly', 'Yearly'], required: true },
  amount: { type: Number, required: true },
  razorpayOrderId: { type: String, required: true, unique: true, index: true },
  razorpayPaymentId: { type: String, unique: true, sparse: true, index: true },
  status: { type: String, enum: ['created', 'captured', 'failed'], default: 'created' },
}, { timestamps: true })

export default mongoose.model('PassPaymentOrder', passPaymentOrderSchema)