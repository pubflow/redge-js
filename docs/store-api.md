# Store API

`@pubflow/redge` exposes Redge's public Store HTTP API through `client.kv` and `client.zsets`.

```ts
import { createClient } from "@pubflow/redge";

const redge = createClient({
  baseUrl: "https://redge.example.com",
  token: process.env.REDGE_API_TOKEN
});
```

Document API, Store API, and WebSocket routes share the same `baseUrl` and `token`.

## KV

```ts
await redge.kv.set("session:1", "hello", {
  ttlSeconds: 60,
  nx: true
});

const value = await redge.kv.get("session:1");
console.log(value.value);

await redge.kv.mset([
  { key: "feature:a", value: "on" },
  { key: "counter", value: "1" }
]);

const batch = await redge.kv.mget(["feature:a", "missing"]);
await redge.kv.delete("feature:a");
const popped = await redge.kv.getdel("session:1");
const count = await redge.kv.incr("counter", { by: 1 });
await redge.kv.expire("counter", 120);
await redge.kv.persist("counter");
const ttl = await redge.kv.ttl("counter");
const type = await redge.kv.type("counter");
const exists = await redge.kv.exists("counter");
const existence = await redge.kv.mexists(["counter", "missing"]);
await redge.kv.mdelete(["counter", "stale:1"]);
const keys = await redge.kv.scan({ match: "feature:*", limit: 100 });
```

Binary-safe writes accept `Uint8Array`:

```ts
await redge.kv.set("blob", new Uint8Array([0, 255]));
```

The server returns both `value` when UTF-8 text is available and `value_base64` for binary-safe reads.

## Sorted Sets

```ts
await redge.zsets.add("rankings", "alice", 42);
await redge.zsets.addMany("rankings", [
  { member: "bob", score: 50 },
  { member: "carol", score: 30 }
]);

const byRank = await redge.zsets.range("rankings", {
  start: 0,
  stop: 9
});

const byScore = await redge.zsets.rangeByScore("rankings", {
  min: 0,
  max: 100,
  rev: true,
  limit: 10
});

const score = await redge.zsets.score("rankings", "alice");
await redge.zsets.incrBy("rankings", "alice", 1.5);
const lowest = await redge.zsets.popMin("rankings", { count: 1 });
const highest = await redge.zsets.popMax("rankings", { count: 1 });
const count = await redge.zsets.count("rankings", { min: 0, max: 100 });
const card = await redge.zsets.card("rankings");
await redge.zsets.remove("rankings", "alice");
await redge.zsets.removeMany("rankings", ["bob", "carol"]);
await redge.zsets.removeByScore("rankings", { min: 0, max: 10 });
```

`add()` / `addMany()` support `Uint8Array` members. Path-based `remove()` and `score()` use text members in Store API v1. Prefer `removeMany()` for binary members.

## Errors

Missing keys or members reject with `RedgeError` and `status: 404`. Wrong-type operations reject with `status: 409` and server details containing `code: "wrong_type"`.
