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
