import express from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/auth.js'
import Ride from '../models/Ride.js'
import Driver from '../models/Driver.js'
import ChatMessage from '../models/ChatMessage.js'
import { store } from '../store.js'

const router = express.Router()
router.use(requireAuth)
const activeStatuses = ['driver_assigned', 'driver_arriving', 'driver_arrived', 'started']

async function rideForUser(req) {
  if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(req.params.rideId)) {
    const ride = await Ride.findById(req.params.rideId)
    if (!ride || !activeStatuses.includes(ride.status)) return null
    const driver = ride.driver ? await Driver.findById(ride.driver) : null
    const isCustomer = String(ride.customer) === req.auth.id
    const isDriver = driver && String(driver.user) === req.auth.id
    return isCustomer || isDriver ? { ride, driver, isCustomer } : null
  }
  const ride = store.rides.find((item) => item._id === req.params.rideId)
  if (!ride || !activeStatuses.includes(ride.status)) return null
  const driver = store.drivers.find((item) => item._id === ride.driver)
  const isCustomer = ride.customer === req.auth.id
  const isDriver = driver?.user === req.auth.id
  return isCustomer || isDriver ? { ride, driver, isCustomer } : null
}

router.get('/:rideId/chat', async (req, res, next) => {
  try {
    const access = await rideForUser(req)
    if (!access) return res.status(403).json({ message: 'Chat is unavailable for this ride' })
    const messages = mongoose.connection.readyState === 1
      ? await ChatMessage.find({ ride: access.ride._id }).sort({ createdAt: 1 }).limit(100)
      : store.chatMessages.filter((item) => item.rideId === access.ride._id)
    res.json({ messages })
  } catch (error) { next(error) }
})

router.post('/:rideId/chat', async (req, res, next) => {
  try {
    const access = await rideForUser(req)
    const message = String(req.body.message || '').trim()
    if (!access) return res.status(403).json({ message: 'Chat is unavailable for this ride' })
    if (!message || message.length > 2000) return res.status(400).json({ message: 'Message must be between 1 and 2000 characters' })
    const receiver = access.isCustomer ? access.driver?.user : access.ride.customer
    if (!receiver) return res.status(409).json({ message: 'A driver has not been assigned yet' })
    const saved = mongoose.connection.readyState === 1
      ? await ChatMessage.create({ ride: access.ride._id, sender: req.auth.id, receiver, message })
      : { _id: `message-${Date.now()}`, rideId: access.ride._id, senderId: req.auth.id, receiverId: receiver, message, read: false, createdAt: new Date() }
    if (mongoose.connection.readyState !== 1) store.chatMessages.push(saved)
    req.app.get('io').to(`ride:${access.ride._id}`).emit('chat:message', saved)
    res.status(201).json({ message: saved })
  } catch (error) { next(error) }
})

router.patch('/:rideId/chat/read', async (req, res, next) => {
  try {
    const access = await rideForUser(req)
    if (!access) return res.status(403).json({ message: 'Chat is unavailable for this ride' })
    if (mongoose.connection.readyState === 1) await ChatMessage.updateMany({ ride: access.ride._id, receiver: req.auth.id }, { read: true })
    else store.chatMessages.filter((item) => item.rideId === access.ride._id && item.receiverId === req.auth.id).forEach((item) => { item.read = true })
    res.json({ success: true })
  } catch (error) { next(error) }
})

export default router