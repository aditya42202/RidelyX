import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['ride', 'payment', 'promotion', 'safety'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  readAt: Date,
}, { timestamps: true })

export default mongoose.model('Notification', notificationSchema)
