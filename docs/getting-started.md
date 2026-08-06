# Getting Started

Install:

```sh
npm install @pubflow/redge
```

Create a client:

```ts
import { createClient } from "@pubflow/redge";

const redge = createClient({
  baseUrl: "https://redge.example.com",
  token: "app-token"
});
```

`baseUrl` should point to the Redge app HTTP listener or proxy route. In local development this is commonly `http://127.0.0.1:8080` for status, Document API, Store API, and WebSocket.

For Admin API calls, provide the admin listener separately when it is on another host or port:

```ts
const redge = createClient({
  baseUrl: "https://redge.example.com",
  token: "app-token",
  adminBaseUrl: "https://redge-admin.example.com",
  adminToken: "admin-token"
});
```

Use `client.kv` and `client.zsets` for public Store API operations:

```ts
await redge.kv.set("session:1", "hello", { ttlSeconds: 60 });
const session = await redge.kv.get("session:1");

await redge.zsets.add("rankings", "alice", 42);
const leaders = await redge.zsets.rangeByScore("rankings", { min: 0, max: 100 });
```

Use Redis-compatible RESP clients when you specifically need Redis TCP behavior.
