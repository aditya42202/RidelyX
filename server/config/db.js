import mongoose from 'mongoose'

export async function connectDatabase() {
  const connectionString = process.env.MONGODB_URI
  if (!connectionString || /localhost|127\.0\.0\.1/.test(connectionString)) {
    console.warn('MONGODB_URI is not configured for production; using the in-memory store.')
    return false
  }
  try {
    await mongoose.connect(connectionString)
    console.log('MongoDB connected')
    return true
  } catch (error) {
    throw new Error(`MongoDB connection failed. Server cannot start. ${error.message}`, { cause: error })
  }
}
