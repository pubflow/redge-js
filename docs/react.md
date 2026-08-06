# React

React support is optional and exported from `@pubflow/redge/react`.

```tsx
import { createClient } from "@pubflow/redge";
import { createRedgeReact } from "@pubflow/redge/react";

const client = createClient({
  baseUrl: "https://redge.example.com",
  token: "app-token"
});

export const redge = createRedgeReact(client);
```

Read a document:

```tsx
function ProductView({ id }: { id: string }) {
  const { data, loading, error, reload } = redge.useDocument<{ name: string }>("products", id);

  if (loading) return null;
  if (error) return <button onClick={() => void reload()}>Retry</button>;
  return <h1>{data?.doc.name}</h1>;
}
```

Query a collection:

```tsx
function Products() {
  const { data } = redge.useCollectionQuery<{ name: string; category: string }>("products", {
    where: { field: "category", value: "apparel" },
    limit: 20
  });

  return data?.docs.map((item) => <div key={item.id}>{item.doc.name}</div>);
}
```

Subscribe to local realtime:

```tsx
function ProductEvents() {
  const { latest, connected } = redge.useSubscription("products");
  return <span>{connected ? latest?.event : "offline"}</span>;
}
```

React Native works when `fetch` and `WebSocket` are available globally. If a runtime needs polyfills, pass them to `createClient`.
