# RideX API

## Run

1. Copy `.env.example` to `.env` when you want to configure MongoDB.
2. Run `npm run dev` from the project root.
3. API health: `http://localhost:4000/api/health`

For real Google Maps routing, add `VITE_GOOGLE_MAPS_API_KEY` to the project `.env` and enable Maps JavaScript API, Directions API, and Places API in Google Cloud. Restrict the key to your local/deployed web origins. Without the key, RideX shows a working visual map fallback.

Without `MONGODB_URI`, the API uses an empty in-memory store for development. No demo accounts are created:

- Create a customer account through `POST /api/auth/register`.
- Partner accounts require an existing user with the `partner` role and a Driver profile.

When `MONGODB_URI` is available, `User` and `Ride` Mongoose models are ready for persistence. Socket.IO provides `ride:join` and `ride:location` events for realtime tracking.
