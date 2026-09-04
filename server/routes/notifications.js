import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import Notification from '../models/Notification.js'

const router = express.Router()
router.use(requireAuth)
router.get('/', async (req, res, next) => {
  try { res.json(await Notification.find({ user: req.auth.id }).sort({ createdAt: -1 }).limit(50)) } catch (error) { next(error) }
})
router.patch('/:id/read', async (req, res, next) => {
  try { const notification = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.auth.id }, { readAt: new Date() }, { new: true }); if (!notification) return res.status(404).json({ message: 'Notification not found' }); res.json({ notification }) } catch (error) { next(error) }
})
export default router
