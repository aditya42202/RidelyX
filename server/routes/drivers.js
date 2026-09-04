import express from 'express'
import { allowRoles, requireAuth } from '../middleware/auth.js'
import Driver from '../models/Driver.js'
import Ride from '../models/Ride.js'
import mongoose from 'mongoose'
import { store } from '../store.js'
import User from '../models/User.js'
import { createNotification } from '../services/notificationService.js'
import { sendRideConfirmation } from '../services/rideConfirmationService.js'

const router = express.Router()
router.use(requireAuth, allowRoles('partner'))
const mongoReady = () => mongoose.connection.readyState === 1
const useMongoForUser = (req) => mongoReady() && mongoose.Types.ObjectId.isValid(req.auth.id)

router.get('/me', async (req, res, next) => {
  try { res.json({ driver: useMongoForUser(req) ? await Driver.findOne({ user: req.auth.id }).select('-documents') : store.drivers.find((item) => item.user === req.auth.id) || null }) } catch (error) { next(error) }
})

router.post('/profile', async (req, res, next) => {
  try {
    const required = ['name', 'vehicleType']
    if (required.some((field) => !req.body[field])) return res.status(400).json({ message: 'Name and vehicle type are required' })
    const profile = { ...req.body, user: req.auth.id, verificationStatus: 'pending', isOnline: false, isAvailable: false }
    const useMongo = useMongoForUser(req)
    const driver = useMongo ? await Driver.findOneAndUpdate({ user: req.auth.id }, profile, { new: true, upsert: true, runValidators: true }).select('-documents') : Object.assign(store.drivers.find((item) => item.user === req.auth.id) || {}, profile)
    if (!useMongo && !store.drivers.includes(driver)) store.drivers.push(driver)
    res.status(201).json({ driver })
  } catch (error) { next(error) }
})

router.patch('/kyc', async (req, res, next) => {
  try {
    const { aadhaarNumber, panNumber, licenseNumber, documents = [] } = req.body
    const normalizedAadhaar = String(aadhaarNumber || '').replace(/\s/g, '')
    const normalizedPan = String(panNumber || '').trim().toUpperCase()
    const normalizedLicense = String(licenseNumber || '').trim().toUpperCase()
    if (!/^\d{12}$/.test(normalizedAadhaar)) return res.status(400).json({ message: 'Enter a valid 12-digit Aadhaar number' })
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(normalizedPan)) return res.status(400).json({ message: 'Enter a valid PAN number' })
    if (!normalizedLicense || normalizedLicense.length > 30) return res.status(400).json({ message: 'Enter a valid driving license number' })
    if (!Array.isArray(documents) || documents.length > 5 || documents.some((item) => typeof item !== 'string' || item.length > 500)) return res.status(400).json({ message: 'KYC documents are invalid' })
    const updates = { aadhaarNumber: normalizedAadhaar, panNumber: normalizedPan, licenseNumber: normalizedLicense, documents, kycSubmittedAt: new Date(), verificationStatus: 'pending' }
    const driver = mongoReady()
      ? await Driver.findOneAndUpdate({ user: req.auth.id }, updates, { new: true, runValidators: true }).select('-aadhaarNumber -panNumber')
      : Object.assign(store.drivers.find((item) => item.user === req.auth.id) || {}, updates)
    if (!driver || (!mongoReady() && !store.drivers.includes(driver))) return res.status(404).json({ message: 'Driver profile not found. Create your profile first.' })
    if (!mongoReady() && !store.drivers.includes(driver)) store.drivers.push(driver)
    res.json({ driver, message: 'KYC submitted for admin verification' })
  } catch (error) { next(error) }
})

router.patch('/availability', async (req, res, next) => {
  try {
    const useMongo = useMongoForUser(req)
    const driver = useMongo ? await Driver.findOneAndUpdate({ user: req.auth.id }, { isOnline: Boolean(req.body.isOnline), isAvailable: Boolean(req.body.isOnline) }, { new: true }).select('-documents') : store.drivers.find((item) => item.user === req.auth.id)
    if (!driver) return res.status(404).json({ message: 'Driver profile not found' })
    if (!useMongo) { driver.isOnline = Boolean(req.body.isOnline); driver.isAvailable = Boolean(req.body.isOnline) }
    res.json({ driver })
  } catch (error) { next(error) }
})

router.patch('/location', async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return res.status(400).json({ message: 'Valid latitude and longitude are required' })
    const useMongo = useMongoForUser(req)
    const driver = useMongo ? await Driver.findOneAndUpdate({ user: req.auth.id }, { currentLocation: { latitude: Number(latitude), longitude: Number(longitude) } }, { new: true }).select('-documents') : store.drivers.find((item) => item.user === req.auth.id)
    if (!driver) return res.status(404).json({ message: 'Driver profile not found' })
    if (!useMongo) driver.currentLocation = { latitude: Number(latitude), longitude: Number(longitude) }
    const activeRide = useMongo
      ? await Ride.findOneAndUpdate({ driver: driver._id, status: { $in: ['driver_assigned', 'driver_arriving', 'driver_arrived', 'started'] } }, { driverLocation: { latitude: Number(latitude), longitude: Number(longitude), updatedAt: new Date() } }, { new: true })
      : store.rides.find((ride) => ride.driver === driver._id && ['driver_assigned', 'driver_arriving', 'driver_arrived', 'started'].includes(ride.status))
    if (!useMongo && activeRide) activeRide.driverLocation = { latitude: Number(latitude), longitude: Number(longitude), updatedAt: new Date() }
    if (activeRide) req.app.get('io').to(`ride:${activeRide._id}`).emit('ride:location', { latitude: Number(latitude), longitude: Number(longitude) })
    res.json({ driver })
  } catch (error) { next(error) }
})

router.get('/rides/requests', async (_req, res, next) => {
  try { res.json({ rides: mongoReady() ? await Ride.find({ status: 'searching' }).sort({ createdAt: 1 }) : store.rides.filter((ride) => ride.status === 'searching') }) } catch (error) { next(error) }
})

router.get('/rides/active', async (req, res, next) => {
  try { const driver = mongoReady() ? await Driver.findOne({ user: req.auth.id }) : store.drivers.find((item) => item.user === req.auth.id); res.json({ ride: mongoReady() ? await Ride.findOne({ driver: driver?._id, status: { $in: ['driver_assigned', 'driver_arriving', 'driver_arrived', 'started'] } }).sort({ createdAt: -1 }) : store.rides.find((ride) => ride.driver === driver?._id && ['driver_assigned', 'driver_arriving', 'driver_arrived', 'started'].includes(ride.status)) || null }) } catch (error) { next(error) }
})

router.patch('/rides/:id/accept', async (req, res, next) => {
  try {
    const driver = mongoReady() ? await Driver.findOne({ user: req.auth.id, isOnline: true, isAvailable: true, verificationStatus: 'approved' }) : store.drivers.find((item) => item.user === req.auth.id && item.isOnline && item.isAvailable && item.verificationStatus === 'approved')
    if (!driver) return res.status(403).json({ message: 'An approved online driver profile is required' })
    const ride = mongoReady() ? await Ride.findOneAndUpdate({ _id: req.params.id, status: 'searching' }, { driver: driver._id, status: 'driver_assigned', confirmedAt: new Date() }, { new: true }) : store.rides.find((item) => item._id === req.params.id && item.status === 'searching')
    if (!ride) return res.status(409).json({ message: 'Ride is no longer available' })
    if (!mongoReady()) { ride.driver = driver._id; ride.status = 'driver_assigned'; ride.confirmedAt = new Date(); driver.isAvailable = false }
    if (mongoReady()) { driver.isAvailable = false; await driver.save() }
    const customer = mongoReady() ? await User.findById(ride.customer) : store.users.find((item) => item._id === ride.customer)
    await createNotification(ride.customer, 'ride', 'Ride confirmed', `Your ${ride.category} ride from ${ride.pickup} to ${ride.destination} has been confirmed.`)
    await sendRideConfirmation({ ride, customer, driver }).catch(() => {})
    req.app.get('io').to(`ride:${ride._id}`).emit('ride:confirmed', { rideId: ride._id, status: ride.status })
    req.app.get('io').to(`ride:${ride._id}`).emit('ride:driver-assigned', { rideId: ride._id, status: ride.status })
    res.json({ ride })
  } catch (error) { next(error) }
})

router.patch('/rides/:id/reject', async (req, res, next) => {
  try {
    const ride = mongoReady() ? await Ride.findOne({ _id: req.params.id, status: 'searching' }) : store.rides.find((item) => item._id === req.params.id && item.status === 'searching')
    if (!ride) return res.status(404).json({ message: 'Ride is no longer available' })
    res.json({ message: 'Ride request rejected', rideId: ride._id })
  } catch (error) { next(error) }
})

router.patch('/rides/:id/status', async (req, res, next) => {
  try {
    const driver = mongoReady() ? await Driver.findOne({ user: req.auth.id }) : store.drivers.find((item) => item.user === req.auth.id)
    const transitions = { driver_arriving: 'driver_assigned', driver_arrived: 'driver_arriving', started: 'driver_arrived', completed: 'started' }
    const expected = transitions[req.body.status]
    const query = { _id: req.params.id, driver: driver?._id, status: expected }
    if (req.body.status === 'started') query.otp = req.body.otp
    const ride = mongoReady() ? await Ride.findOneAndUpdate(query, { status: req.body.status, ...(req.body.status === 'started' ? { startedAt: new Date() } : {}), ...(req.body.status === 'completed' ? { completedAt: new Date() } : {}) }, { new: true }) : store.rides.find((item) => item._id === req.params.id && item.driver === driver?._id && item.status === expected && (!req.body.otp || item.ridePin === req.body.otp))
    if (!ride) return res.status(400).json({ message: 'Invalid transition or ride PIN' })
    if (!mongoReady()) { ride.status = req.body.status; if (req.body.status === 'completed') ride.completedAt = new Date() }
    if (req.body.status === 'completed' && driver) { driver.isAvailable = true; driver.totalRides += 1; driver.totalEarnings += ride.fare; if (mongoReady()) await driver.save() }
    req.app.get('io').to(`ride:${ride._id}`).emit(`ride:${req.body.status.replace('_', '-')}`, { rideId: ride._id, status: ride.status })
    res.json({ ride })
  } catch (error) { next(error) }
})

export default router
