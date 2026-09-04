import express from 'express'
import { allowRoles, requireAuth } from '../middleware/auth.js'
import { store } from '../store.js'

const router = express.Router()
const requestTypes = ['rental', 'shared', 'pass']
router.use(requireAuth)

router.post('/', (req, res) => {
  const { type, details } = req.body
  if (!requestTypes.includes(type) || !details || typeof details !== 'object') return res.status(400).json({ message: 'Valid request details are required' })
  const request = { _id: `request-${Date.now()}`, user: req.auth.id, type, details, status: 'pending', createdAt: new Date() }
  store.serviceRequests.push(request)
  req.app.get('io').to('admins').emit('admin:new-request', { request })
  res.status(201).json({ request })
})

router.get('/mine', (req, res) => res.json({ requests: store.serviceRequests.filter((request) => request.user === req.auth.id).sort((a, b) => b.createdAt - a.createdAt) }))

router.get('/admin', allowRoles('admin'), (req, res) => res.json({ requests: store.serviceRequests.sort((a, b) => b.createdAt - a.createdAt) }))

router.patch('/admin/:id', allowRoles('admin'), (req, res) => {
  if (!['approved', 'rejected'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid request status' })
  const request = store.serviceRequests.find((item) => item._id === req.params.id)
  if (!request) return res.status(404).json({ message: 'Request not found' })
  request.status = req.body.status
  request.reviewedAt = new Date()
  req.app.get('io').to(`user:${request.user}`).emit('request:updated', { request })
  res.json({ request })
})

export default router
