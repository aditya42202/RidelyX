import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import http from 'http'
import { Server } from 'socket.io'
import { connectDatabase } from './config/db.js'
import { seedStore } from './store.js'
import authRoutes from './routes/auth.js'
import rideRoutes from './routes/rides.js'
import walletRoutes from './routes/wallet.js'
import adminRoutes from './routes/admin.js'
import driverRoutes from './routes/drivers.js'
import paymentRoutes from './routes/payments.js'
import couponRoutes from './routes/coupons.js'
import ratingRoutes from './routes/ratings.js'
import notificationRoutes from './routes/notifications.js'
import requestRoutes from './routes/requests.js'
import passRoutes from './routes/pass.js'
import chatRoutes from './routes/chat.js'
import jwt from 'jsonwebtoken'
import Ride from './models/Ride.js'
import Driver from './models/Driver.js'
import mongoose from 'mongoose'

dotenv.config({ path: new URL('../.env.example', import.meta.url) })

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true } })
app.set('io', io)

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.get('/api/health', (_req, res) => res.json({ service: 'RideX API', status: 'ok', timestamp: new Date().toISOString() }))
app.use('/api/auth', authRoutes)
app.use('/api/rides', rideRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/drivers', driverRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/coupons', couponRoutes)
app.use('/api/ratings', ratingRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/pass', passRoutes)
app.use('/api/rides', chatRoutes)
app.use((error, _req, res, next) => { console.error(error); void next; res.status(500).json({ message: 'Something went wrong on the RideX server' }) })

io.use((socket, next) => {
  try {
    const cookie = socket.handshake.headers.cookie?.split('; ').find((item) => item.startsWith('ridex_token='))
    const token = cookie?.split('=')[1]
    if (!token || !process.env.JWT_SECRET) return next(new Error('Authentication required'))
    socket.data.auth = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch { next(new Error('Session expired')) }
})

io.on('connection', (socket) => {
  socket.on('partner:join', () => { if (socket.data.auth.role === 'partner') socket.join('partners') })
  socket.on('admin:join', () => { if (socket.data.auth.role === 'admin') socket.join('admins') })
  socket.on('user:join', (userId) => { if (String(userId) === socket.data.auth.id) socket.join(`user:${userId}`) })
  socket.on('ride:join', async (rideId) => {
    try {
      const ride = mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(rideId)
        ? await Ride.findById(rideId)
        : null
      const isCustomer = ride && String(ride.customer) === socket.data.auth.id
      const driver = ride?.driver ? await Driver.findById(ride.driver) : null
      const isDriver = driver && String(driver.user) === socket.data.auth.id
      if (isCustomer || isDriver) socket.join(`ride:${rideId}`)
    } catch (error) { void error }
  })
  const rideEvents = ['ride:request', 'ride:accepted', 'ride:rejected', 'ride:driver-assigned', 'ride:driver-arriving', 'ride:driver-arrived', 'ride:started', 'ride:completed', 'ride:cancelled']
  rideEvents.forEach((eventName) => socket.on(eventName, ({ rideId, ...payload } = {}) => io.to(`ride:${rideId}`).emit(eventName, payload)))
  socket.on('ride:location', ({ rideId, location }) => io.to(`ride:${rideId}`).emit('ride:location', location))
})

const port = Number(process.env.PORT || 4000)
let initializationPromise

export function initializeServer() {
  initializationPromise ??= connectDatabase().then(() => seedStore())
  return initializationPromise
}

export { app }

if (!process.env.VERCEL) {
  await initializeServer()
  server.listen(port, () => console.log(`RideX API listening on http://localhost:${port}`))
}
