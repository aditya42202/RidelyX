import { app, initializeServer } from '../server/index.js'

export default async function handler(request, response) {
  await initializeServer()
  return app(request, response)
}