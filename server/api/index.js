import { app, initializeServer } from '../index.mjs'

export default async function handler(request, response) {
  const pathname = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname
  if (pathname === '/api/health') return app(request, response)
  await initializeServer()
  return app(request, response)
}