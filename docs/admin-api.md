# Admin API and Keys

Redge currently exposes HTTP key inspection through the Admin API, not through the public Document API. This client keeps that distinction explicit under `client.admin`.

```ts
const redge = createClient({
  baseUrl: "https://redge.example.com",
  token: "app-token",
  adminBaseUrl: "https://redge-admin.example.com",
  adminToken: "admin-token"
});
```

Service info and cache stats:

```ts
const info = await redge.admin.info();
const cache = await redge.admin.cache();
```

List and inspect keys:

```ts
const page = await redge.admin.keys.list({
  match: "session:*",
  cursor: "0",
  count: 100
});

const key = await redge.admin.keys.get("session:123");
```

Delete one key when the Admin API is not readonly:

```ts
await redge.admin.keys.delete("session:123");
```

Inspect sorted set members:

```ts
const members = await redge.admin.zsets.range("rankings", {
  start: 0,
  stop: 99
});
```

Run expired-key cleanup:

```ts
await redge.admin.cleanup();
```

For production, bind the Admin API to a private network or protect it with a trusted proxy and a strong token.
