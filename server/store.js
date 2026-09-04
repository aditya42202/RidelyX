import bcrypt from 'bcryptjs'

export const store = {
  users: [],
  rides: [],
  payments: [],
  drivers: [],
  serviceRequests: [],
  otpChallenges: new Map(),
  chatMessages: [],
}

export async function seedStore() {
  if (store.users.length) return
  const password = await bcrypt.hash('ridex123', 10)
  store.users.push(
    { _id: 'demo-customer', name: 'Arjun Sharma', email: 'arjun@ridex.app', phone: '+91 98765 43210', password, role: 'customer', walletBalance: 1240 },
    { _id: 'demo-partner', name: 'Kabir Pradhan', email: 'kabir@ridex.app', password, role: 'partner', walletBalance: 2840 },
    { _id: 'demo-admin', name: 'RideX Admin', email: 'admin@ridex.app', password, role: 'admin', walletBalance: 0 },
  )
}
