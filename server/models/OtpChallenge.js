import mongoose from 'mongoose'

const otpChallengeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mobile: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  otpHash: { type: String, required: true },
  purpose: { type: String, enum: ['login', 'signup'], default: 'login' },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true })

export default mongoose.model('OtpChallenge', otpChallengeSchema)