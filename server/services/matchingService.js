import Driver from '../models/Driver.js'

const distanceBetween = (first, second) => {
  if (!first?.latitude || !first?.longitude || !second?.latitude || !second?.longitude) return Number.POSITIVE_INFINITY
  const latDelta = first.latitude - second.latitude
  const lngDelta = first.longitude - second.longitude
  return Math.sqrt(latDelta ** 2 + lngDelta ** 2)
}

export async function findBestDriver(pickupLocation, vehicleType) {
  const drivers = await Driver.find({ isOnline: true, isAvailable: true, verificationStatus: 'approved', vehicleType })
  return drivers.sort((first, second) => {
    const firstScore = distanceBetween(first.currentLocation, pickupLocation) * 0.55 - first.rating * 0.25 - first.acceptanceRate * 0.2
    const secondScore = distanceBetween(second.currentLocation, pickupLocation) * 0.55 - second.rating * 0.25 - second.acceptanceRate * 0.2
    return firstScore - secondScore
  })[0] || null
}
