# Redge Client Completion Report

## Implemented

- Universal TypeScript core client with no runtime dependencies.
- Document API client for indexes, CRUD, query, search, and subscriptions.
- Store API client for KV strings, binary-safe writes, TTL, counters, scan, and sorted sets.
- WebSocket subscription client with handshake buffering so events sent immediately after subscribe are not lost.
- Admin API client for info, cache stats, cleanup, key listing, key inspection, key deletion, and sorted set ranges.
- Optional React subpath with `createRedgeReact`, `useDocument`, `useCollectionQuery`, and `useSubscription`.
- Package exports for ESM, CommonJS, and TypeScript declarations.
- Documentation under `docs/`.
- Tests for HTTP Document API, Admin keys API, WebSocket subscriptions, and React hooks.

## Verified

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`
- `npm audit --omit=dev`
- `npm pack --dry-run`
- ESM import smoke from `dist/index.js`
- CommonJS require smoke from `dist/index.cjs`

## Notes

- `client.kv` and `client.zsets` are app-facing Store API surfaces.
- `client.admin.keys` remains private inspection/admin-only, not the recommended app data path.
