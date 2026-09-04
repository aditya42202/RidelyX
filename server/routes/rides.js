import express from 'express'
import { randomInt } from 'node:crypto'
import { requireAuth } from '../middleware/auth.js'
import Ride from '../models/Ride.js'
import { store } from '../store.js'
import { findBestDriver } from '../services/matchingService.js'
import mongoose from 'mongoose'

const router = express.Router()
const fareConfig = { Bike: { base: 35, perKm: 8, perMinute: 1.2 }, Auto: { base: 55, perKm: 12, perMinute: 1.8 }, Cab: { base: 85, perKm: 16, perMinute: 2.2 }, Shared: { base: 45, perKm: 9, perMinute: 1.4 }, Premium: { base: 140, perKm: 25, perMinute: 3.2 }, XL: { base: 120, perKm: 22, perMinute: 2.8 } }
const cityMultipliers = { Lucknow: 0.9, Delhi: 1, Bengaluru: 1.15 }
const calculateQuote = (category, distance, duration, city) => {
  const config = fareConfig[category] || fareConfig.Bike
  const fare = Math.round((config.base + distance * config.perKm + duration * config.perMinute) * (cityMultipliers[city] || 1))
  return { category, fare, eta: Math.max(4, Math.round(distance * 0.7)), duration, distance }
}
const findUserRides = (id) => store.rides.filter((ride) => ride.customer === id)
const useMongoForUser = (req) => mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(req.auth.id)

router.post('/quote', requireAuth, (req, res) => {
  const { city = 'Delhi', destination = 'Connaught Place' } = req.body
  const requestedDistance = Number(req.body.distance)
  const distance = Number.isFinite(requestedDistance) && requestedDistance > 0 ? Math.min(requestedDistance, 500) : destination.toLowerCase().includes('airport') ? 18.4 : 8.4
  const requestedDuration = Number(req.body.duration)
  const duration = Number.isFinite(requestedDuration) && requestedDuration > 0 ? Math.min(Math.round(requestedDuration), 720) : Math.max(12, Math.round(distance * 2.4))
  const quote = Object.keys(fareConfig).map((category) => calculateQuote(category, distance, duration, city))
  res.json({ city, pickup: 'Current location', destination, distance, quote })
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { city = 'Delhi', pickup = 'Current location', destination = 'Connaught Place', category = 'Bike', pickupLocation, destinationLocation, routeIndex = 0, routeSummary, routePolyline } = req.body
    const normalizedPickupLocation = pickupLocation?.lat !== undefined ? { latitude: pickupLocation.lat, longitude: pickupLocation.lng } : pickupLocation
    const normalizedDestinationLocation = destinationLocation?.lat !== undefined ? { latitude: destinationLocation.lat, longitude: destinationLocation.lng } : destinationLocation
    const distance = Number(req.body.distance) || 1
    const duration = Number(req.body.duration) || Math.max(12, Math.round(distance * 2.4))
    const quote = calculateQuote(category, distance, duration, city)
    const useMongo = useMongoForUser(req)
    const driver = useMongo && normalizedPickupLocation ? await findBestDriver(normalizedPickupLocation, category) : null
    const ridePin = String(randomInt(1000, 10000))
    const ride = !useMongo ? { _id: `ride-${Date.now()}`, customer: req.auth.id, city, pickup, pickupLocation: normalizedPickupLocation, destination, destinationLocation: normalizedDestinationLocation, routeIndex, routeSummary, routePolyline, category, distance, duration, fare: quote.fare, status: driver ? 'driver_assigned' : 'searching', paymentStatus: 'pending', paymentRoute: routeSummary, ridePin, otp: ridePin, createdAt: new Date() } : await Ride.create({ customer: req.auth.id, city, pickup, pickupLocation: normalizedPickupLocation, destination, destinationLocation: normalizedDestinationLocation, routeIndex, routeSummary, routePolyline, category, distance, duration, fare: quote.fare, driver: driver?._id, status: driver ? 'driver_assigned' : 'searching', paymentStatus: 'pending', ridePin, otp: ridePin })
    if (!store.rides.includes(ride)) store.rides.push(ride)
    req.app.get('io').to(`ride:${ride._id}`).emit('ride:request', { rideId: ride._id, status: ride.status })
    req.app.get('io').to('partners').emit('ride:new-request', { ride })
    res.status(201).json(ride)
  } catch (error) { next(error) }
})

router.get('/', requireAuth, async (req, res, next) => {
  try { res.json(useMongoForUser(req) ? await Ride.find({ customer: req.auth.id }).sort({ createdAt: -1 }) : findUserRides(req.auth.id)) } catch (error) { next(error) }
})

router.get('/:id/location', requireAuth, async (req, res, next) => {
  try {
    const ride = useMongoForUser(req)
      ? await Ride.findOne({ _id: req.params.id, customer: req.auth.id }).select('driverLocation pickupLocation destinationLocation status')
      : store.rides.find((item) => item._id === req.params.id && item.customer === req.auth.id)
    if (!ride) return res.status(404).json({ message: 'Ride not found' })
    res.json({ location: ride.driverLocation || null, pickup: ride.pickupLocation, destination: ride.destinationLocation, status: ride.status })
  } catch (error) { next(error) }
})

router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const allowed = ['searching', 'driver_assigned', 'driver_arriving', 'driver_arrived', 'started', 'completed', 'cancelled']
    const { status, otp } = req.body
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid ride status' })
    const ride = useMongoForUser(req) ? await Ride.findOne({ _id: req.params.id, customer: req.auth.id }) : store.rides.find((item) => item._id === req.params.id && item.customer === req.auth.id)
    if (!ride) return res.status(404).json({ message: 'Ride not found' })
    if (status === 'started' && otp !== ride.otp) return res.status(400).json({ message: 'Invalid ride PIN' })
    ride.status = status
    if (status === 'started') ride.startedAt = new Date()
    if (status === 'completed') ride.completedAt = new Date()
    if (status === 'cancelled') ride.cancelledAt = new Date()
    if (ride.save) await ride.save()
    req.app.get('io').to(`ride:${ride._id}`).emit(`ride:${status.replace('_', '-')}`, { rideId: ride._id, status: ride.status })
    res.json({ ride })
  } catch (error) { next(error) }
})

export default router
