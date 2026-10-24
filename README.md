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

Deploy from the repository root so Vercel can build the client and discover `api/index.js`. The root `vercel.json` sends `/api/*` requests to the Express API and routes other paths to the client.

Set these environment variables in the Vercel project:

- `CLIENT_URL`: the exact public origin of the client, such as `https://ridelyx-client.vercel.app`.
- `MONGODB_URI`: the production MongoDB connection string.

`VITE_API_URL` is empty by default, so the frontend uses the same origin for API and Socket.IO requests. Set it to a separate backend's public origin only if the API is deployed as a different project. Redeploy after changing the configuration or environment variables.

The API requires a reachable `MONGODB_URI` in Vercel and returns `503` with a configuration message if it is missing; it does not fall back to non-persistent in-memory storage in production. Keep database credentials out of `.env.example` and source control.
