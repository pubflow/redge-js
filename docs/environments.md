# Environments

## Node.js

Node.js 18+ includes `fetch`. Node.js 22+ also includes a WebSocket implementation. For older Node runtimes, pass a WebSocket constructor:

```ts
import { WebSocket } from "ws";

const redge = createClient({
  baseUrl: "http://127.0.0.1:8080",
  token: "app-token",
  WebSocket: WebSocket as any
});
```

## Browser

Use the browser globals:

```ts
const redge = createClient({
  baseUrl: "https://redge.example.com",
  token: "app-token"
});
```

Enable CORS on Redge for the browser origin.

## Next.js

Use the same package in server or client components. Keep tokens server-side when possible. For browser subscriptions, expose only the app token intended for that browser app.

## React Native

React Native typically provides `fetch` and `WebSocket` globally. If your runtime does not, pass compatible implementations:

```ts
const redge = createClient({
  baseUrl,
  token,
  fetch: customFetch,
  WebSocket: CustomWebSocket
});
```

## WebSocket Auth

Subscriptions use `?token=` because browsers and React Native cannot set custom headers during WebSocket construction. HTTP requests use `Authorization: Bearer`.
