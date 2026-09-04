import { io } from 'socket.io-client'

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', { autoConnect: false, withCredentials: true })

export function joinRide(rideId) {
  if (!socket.connected) socket.connect()
  socket.emit('ride:join', rideId)
}

export function joinPartnerRoom() {
  if (socket.connected) socket.emit('partner:join')
  else { socket.once('connect', () => socket.emit('partner:join')); socket.connect() }
}

export function joinAdminRoom() {
  if (socket.connected) socket.emit('admin:join')
  else { socket.once('connect', () => socket.emit('admin:join')); socket.connect() }
}

export function onRideEvent(eventName, handler) {
  socket.on(eventName, handler)
  return () => socket.off(eventName, handler)
}

export default socket
