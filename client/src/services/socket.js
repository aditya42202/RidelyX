import { io } from 'socket.io-client'

const socketUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin)
const socket = io(socketUrl, { autoConnect: false, withCredentials: true })

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
