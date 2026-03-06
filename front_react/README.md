# Eligio Frontend (React + Vite)

## Local Development

```bash
npm ci
npm run dev
```

Default dev URL: `http://localhost:8080`

## Backend API Target

Set in `.env`:

```env
VITE_API_BASE_URL=/api
```

- Local dev with Vite proxy: keep `/api`
- Production: set `VITE_API_BASE_URL=https://api.eligio.net/api` at build time

## Production Build

```bash
VITE_API_BASE_URL=https://api.eligio.net/api npm run build
```

Build output is generated in `dist/`.
