import express from 'express'
import { allowRoles, requireAuth } from '../middleware/auth.js'
import { store } from '../store.js'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Driver from '../models/Driver.js'
import Ride from '../models/Ride.js'
import Payment from '../models/Payment.js'
import Coupon from '../models/Coupon.js'

const router = express.Router()
router.use(requireAuth, allowRoles('admin'))
router.get('/overview', (_req, res) => res.json({ totalUsers: store.users.length, activeDrivers: 0, todaysRides: store.rides.length, revenue: store.rides.filter((ride) => ride.status === 'completed').reduce((total, ride) => total + (ride.fare || 0), 0), cancellationRate: 0, averageFare: 0, recentAlerts: 0, topRoutes: [] }))
router.get('/users', async (_req, res, next) => { try { const users = mongoose.connection.readyState === 1 ? await User.find().select('-password') : store.users.map((user) => { const safeUser = { ...user }; delete safeUser.password; return safeUser }); res.json(users) } catch (error) { next(error) } })
router.get('/drivers', async (_req, res, next) => { try { res.json(mongoose.connection.readyState === 1 ? await Driver.find().select('-documents') : store.drivers) } catch (error) { next(error) } })
router.patch('/drivers/:id/verification', async (req, res, next) => { try { if (!['pending', 'approved', 'rejected'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid verification status' }); const driver = await Driver.findByIdAndUpdate(req.params.id, { verificationStatus: req.body.status }, { new: true }).select('-documents'); if (!driver) return res.status(404).json({ message: 'Driver not found' }); res.json({ driver }) } catch (error) { next(error) } })
router.get('/rides', async (_req, res, next) => { try { res.json(mongoose.connection.readyState === 1 ? await Ride.find().sort({ createdAt: -1 }).limit(100) : store.rides) } catch (error) { next(error) } })
router.get('/payments', async (_req, res, next) => { try { res.json(mongoose.connection.readyState === 1 ? await Payment.find().sort({ createdAt: -1 }).limit(100) : store.payments) } catch (error) { next(error) } })
router.get('/coupons', async (_req, res, next) => { try { res.json(mongoose.connection.readyState === 1 ? await Coupon.find().sort({ createdAt: -1 }) : []) } catch (error) { next(error) } })
router.post('/coupons', async (req, res, next) => { try { const coupon = await Coupon.create({ ...req.body, code: String(req.body.code || '').toUpperCase() }); res.status(201).json({ coupon }) } catch (error) { next(error) } })
router.patch('/coupons/:id', async (req, res, next) => { try { const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!coupon) return res.status(404).json({ message: 'Coupon not found' }); res.json({ coupon }) } catch (error) { next(error) } })
export default router
