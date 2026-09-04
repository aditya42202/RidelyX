import Notification from '../models/Notification.js'
import mongoose from 'mongoose'

export async function createNotification(userId, type, title, message) {
  if (mongoose.connection.readyState !== 1) return null
  return Notification.create({ user: userId, type, title, message })
}
