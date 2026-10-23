# Faktuvi

Official repository for the Faktuvi SaaS.

## Stack

- React 19 + TypeScript
- TanStack Start / TanStack Router
- Vite
- Tailwind CSS 4
- TanStack Query
- Axios
- i18next (NL / EN / PT)

## Development

```sh
bun install
bun run dev
```

or:

```sh
npm install
npm run dev
```

## Checks

```sh
bun run lint
bun run build
```

## Architecture

The application uses same-origin `/api` requests in production. Local development may use the optional API base URL documented in `.env.example`.

See `docs/CURRENT_STATE.md` for the audited architecture and launch-readiness status.
