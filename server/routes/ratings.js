import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import Rating from '../models/Rating.js'
import Ride from '../models/Ride.js'
import Driver from '../models/Driver.js'

const router = express.Router()
router.use(requireAuth)

router.post('/', async (req, res, next) => {
  try {
    const score = Number(req.body.score)
    if (!req.body.rideId || !Number.isInteger(score) || score < 1 || score > 5) return res.status(400).json({ message: 'Ride and score from 1 to 5 are required' })
    const ride = await Ride.findOne({ _id: req.body.rideId, customer: req.auth.id, status: 'completed' })
    if (!ride || !ride.driver) return res.status(400).json({ message: 'Only completed rides with an assigned driver can be rated' })
    const rating = await Rating.create({ ride: ride._id, customer: req.auth.id, driver: ride.driver, score, comment: req.body.comment })
    const ratings = await Rating.find({ driver: ride.driver })
    await Driver.findByIdAndUpdate(ride.driver, { rating: ratings.reduce((total, item) => total + item.score, 0) / ratings.length })
    res.status(201).json({ rating })
  } catch (error) { next(error) }
})

export default router
