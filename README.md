# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# RideX

## Project layout

- `client/` contains the React/Vite frontend.
- `server/` contains the Express/MongoDB API and Socket.IO server.

## Run locally

Run these in two separate terminals from the project root:

```bash
npm run client
```

```bash
npm run server
```

The client runs on `http://localhost:5173` and the server runs on `http://localhost:4000`.

## Deploy to Vercel

Deploy from the repository root so Vercel can build the client. The `VITE_API_URL` setting points the frontend's API and Socket.IO traffic at the separate Render service.

Set this environment variable in the Vercel project:

- `VITE_API_URL=https://ridelyx.onrender.com` so the deployed client sends API and Socket.IO requests to Render.

The Vercel API is not used when `VITE_API_URL` points to Render. Redeploy the frontend after updating this setting.

## Deploy the API to Render

Use the repository's `render.yaml` Blueprint, or configure the Render web service with root directory `server`, build command `npm install && npm run build`, and start command `npm start`. The server package's build script checks the Node entrypoints; the API does not need a separate compilation step.

The Render Blueprint sets `CLIENT_URL` to `https://ridelyx-client.vercel.app` and the Google OAuth callback to `https://ridelyx.onrender.com/api/auth/google/callback`. Set `MONGODB_URI` to a reachable production MongoDB connection and generate a strong `JWT_SECRET` in Render. To enable Google sign-in, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Render. The frontend's `VITE_API_URL` should be `https://ridelyx.onrender.com`.
