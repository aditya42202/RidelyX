import mongoose from 'mongoose'

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MongoDB connection failed. Server cannot start: MONGODB_URI is missing.')
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('MongoDB connected')
    return true
  } catch (error) {
    throw new Error(`MongoDB connection failed. Server cannot start. ${error.message}`, { cause: error })
  }
}
