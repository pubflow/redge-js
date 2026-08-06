# Redge Client Implementation Plan

## Goal

Build a universal TypeScript client for Redge that works in Node.js, browsers, Next.js, React, and React Native. The client should cover the public Document API, the public Store HTTP API, local realtime subscriptions, and the private Admin inspection API.

## Package Shape

- Package name: `@pubflow/redge`.
- Runtime dependencies: none.
- Peer dependency: `react` only for the optional `@pubflow/redge/react` subpath.
- Main exports:
  - `@pubflow/redge`: universal core client.
  - `@pubflow/redge/react`: optional React hooks.

## Core API

- `createClient({ baseUrl, token, transport, fetch, WebSocket })`.
- Optional `adminBaseUrl` and `adminToken` when Admin API is exposed on a different listener.
- `client.collection<T>(name)` for Document API operations.
- `collection.configureIndexes({ fields, searchFields })`.
- `collection.get(id)`, `insert(doc, options)`, `upsert(id, doc, options)`, `patch(id, patch, options)`, `delete(id)`.
- `collection.find(options)` and `collection.search(text, options)`.
- `collection.subscribe(handler, options)` for local realtime subscriptions.
- `client.admin` for Admin API:
  - `info()`, `cache()`, `cleanup()`.
  - `keys.list()`, `keys.get()`, `keys.delete()`.
  - `zsets.range()`.
- `client.kv` for Store API:
  - `get()`, `set()`, `delete()`, `mget()`, `mset()`, `getdel()`.
  - `incr()`, `expire()`, `persist()`, `ttl()`, `scan()`.
- `client.zsets` for Store API:
  - `add()`, `range()`, `rangeByScore()`, `remove()`, `removeByScore()`, `score()`, `count()`, and `card()`.

## Transport Strategy

- HTTP is the default for CRUD/query/admin.
- WebSocket is used for subscriptions.
- `transport: "auto"` may use WebSocket for document operations when connected later, but v1 keeps document CRUD HTTP-first for predictability.
- WebSocket auth uses headers when supported by the injected constructor; otherwise falls back to `?token=`.

## Errors

- Throw `RedgeError` for HTTP errors, WebSocket operation errors, invalid configuration, and transport failures.
- Preserve `status`, `code`, `message`, and optional `details`.

## Documentation

- `docs/getting-started.md`.
- `docs/document-api.md`.
- `docs/react.md`.
- `docs/admin-api.md`.
- `docs/environments.md`.
- `docs/testing.md`.

## Tests

- Core HTTP CRUD/query/index tests with a mocked HTTP server.
- Admin keys/zset/cache/info tests with a mocked HTTP server.
- Store API KV and sorted-set tests with a mocked HTTP server.
- WebSocket subscription tests with a local WebSocket server.
- React hooks smoke tests with React test renderer.
- TypeScript build and declaration generation.
