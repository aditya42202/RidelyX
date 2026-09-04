import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['upi', 'card', 'wallet', 'cash', 'ridepass'], required: true },
  status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending' },
  provider: { type: String, default: 'manual' },
  gatewayReference: String,
}, { timestamps: true })

export default mongoose.model('Payment', paymentSchema)
