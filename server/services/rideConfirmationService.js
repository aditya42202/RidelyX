import nodemailer from 'nodemailer'

const transport = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
}

export async function sendRideConfirmation({ ride, customer, driver }) {
  const driverName = driver?.name || 'A verified driver'
  const details = `Ride ID: ${ride._id}\nPickup: ${ride.pickup}\nDrop: ${ride.destination}\nDriver: ${driverName}\nFare: ₹${ride.fare}\nStatus: ${ride.status}`
  const mailer = transport()
  if (mailer && customer?.email) await mailer.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: customer.email, subject: `RideX ride confirmed · ${ride._id}`, text: `${details}\n\nTrack your ride in the RideX app.` })
  if (process.env.SMS_PROVIDER !== 'mock' && process.env.SMS_API_URL && process.env.SMS_API_KEY && customer?.mobile) {
    await fetch(process.env.SMS_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SMS_API_KEY}` }, body: JSON.stringify({ to: customer.mobile, message: `RideX: Your ride is confirmed. Pickup: ${ride.pickup}. Drop: ${ride.destination}. Driver: ${driverName}.` }) })
  }
}