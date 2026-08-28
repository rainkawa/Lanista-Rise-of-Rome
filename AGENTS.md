# Base44 Dev Environment

## App overview
- **Ludus Magnus: Reborn** — a frontend-only Roman gladiator management simulation game.
- Stack: React 18 + TypeScript + Vite 5 + Redux Toolkit + Tailwind CSS + framer-motion.
- **No backend.** All game state is persisted in the browser (redux-persist + localStorage). No external services, databases, or secrets required.

## Running the app
```
docker compose -f docker-compose.base44.yml up -d
```
- Service `web` uses the `node:22` base image, bind-mounts the repo at `/app`, installs deps on startup (`npm install`), and runs `vite` dev server with HMR on port 3000.
- `node_modules` lives in a named volume so host installs don't clobber it.
- Healthcheck hits `http://localhost:3000/`.

## Preview notes
- `vite.config.ts` has `server.host: true` and `server.allowedHosts: true` so the preview's external hostname is accepted.
- `server.open: true` is set; in the container this logs a harmless `spawn xdg-open ENOENT` — ignore it.

## Verification
- `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/` returns the Vite-served `index.html`.
- Dev server logs show `VITE v5.x ready` and serves `/@vite/client` (HMR) — confirms live source, not a prebuilt bundle.

## Tests / lint
- `npm test` (vitest), `npm run lint`, `npm run type-check`.
