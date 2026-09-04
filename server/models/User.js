import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@gmail\.com$/i },
  phone: { type: String, trim: true },
  mobile: { type: String, trim: true, unique: true, sparse: true, match: /^\+91[6-9]\d{9}$/ },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['customer', 'partner', 'admin'], default: 'customer' },
  profileImage: String,
  rating: { type: Number, default: 5 },
  walletBalance: { type: Number, default: 0 },
  passPlan: { type: String, enum: ['Weekly', 'Monthly', 'Yearly'] },
  passExpiresAt: Date,
  isVerified: { type: Boolean, default: false },
  emergencyContact: { name: String, phone: String },
  resetTokenHash: { type: String, select: false },
  resetTokenExpiresAt: { type: Date, select: false },
  firebaseUid: { type: String, unique: true, sparse: true },
  phoneVerified: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('User', userSchema)
