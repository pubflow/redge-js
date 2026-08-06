# @pubflow/redge

Universal TypeScript client for Redge's Document API, Store HTTP API, local realtime WebSocket subscriptions, and Admin inspection APIs.

```ts
import { createClient } from "@pubflow/redge";

const redge = createClient({
  baseUrl: "https://redge.example.com",
  token: process.env.REDGE_API_TOKEN
});

type Product = {
  id?: string;
  name: string;
  category: string;
  price: number;
};

const products = redge.collection<Product>("products");

await products.configureIndexes({
  fields: ["category"],
  searchFields: ["name"]
});

await products.insert({
  id: "p1",
  name: "Blue Shirt",
  category: "apparel",
  price: 29
});

const result = await products.find({
  where: { field: "category", value: "apparel" },
  search: "Blue"
});

await redge.kv.set("session:1", "hello", { ttlSeconds: 60 });
const session = await redge.kv.get("session:1");

await redge.zsets.add("rankings", "alice", 42);
const leaders = await redge.zsets.rangeByScore("rankings", {
  min: 0,
  max: 100,
  rev: true
});
```

## What This Client Supports

- Node.js 18+
- Browsers
- Next.js client/server code
- React
- React Native with global or injected `fetch` and `WebSocket`
- Document API CRUD/query/indexes
- Store API KV, TTL, counters, scan, and sorted sets
- WebSocket subscriptions
- Admin API key inspection, zset inspection, cache stats, info, and cleanup

Use `client.kv` and `client.zsets` for app-facing Store API operations. Use `client.admin.keys` only for private inspection/admin workflows.

## Docs

- [Getting Started](./docs/getting-started.md)
- [Document API](./docs/document-api.md)
- [Store API](./docs/store-api.md)
- [React](./docs/react.md)
- [Admin API and Keys](./docs/admin-api.md)
- [Environments](./docs/environments.md)
- [Testing](./docs/testing.md)
