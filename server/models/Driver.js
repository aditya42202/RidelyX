import mongoose from 'mongoose'

const driverSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true, trim: true },
  phone: String,
  vehicleType: { type: String, enum: ['Bike', 'Auto', 'Cab', 'Premium', 'XL'], required: true },
  vehicleModel: String,
  vehicleNumber: String,
  vehicleColor: String,
  licenseNumber: String,
  aadhaarNumber: { type: String, trim: true },
  panNumber: { type: String, uppercase: true, trim: true },
  kycSubmittedAt: Date,
  rating: { type: Number, default: 5 },
  totalRides: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  acceptanceRate: { type: Number, default: 0 },
  isOnline: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: false },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  documents: [{ type: String }],
  currentLocation: { latitude: Number, longitude: Number },
}, { timestamps: true })

export default mongoose.model('Driver', driverSchema)
