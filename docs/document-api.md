# Document API

Create a typed collection client:

```ts
type Product = {
  id?: string;
  name: string;
  category: string;
  price?: number;
};

const products = redge.collection<Product>("products");
```

Configure explicit indexes before querying fields:

```ts
await products.configureIndexes({
  fields: ["category", "sku"],
  searchFields: ["name", "description"]
});
```

CRUD:

```ts
const created = await products.insert({
  id: "p1",
  name: "Blue Shirt",
  category: "apparel"
});

const current = await products.get("p1");
const updated = await products.upsert("p1", {
  name: "Blue Shirt",
  category: "apparel",
  price: 31
});
const patched = await products.patch("p1", { price: 35 });
const deleted = await products.delete("p1");
```

Query:

```ts
const page = await products.find({
  where: { field: "category", value: "apparel" },
  search: "Blue",
  limit: 20
});

if (page.has_more) {
  const next = await products.find({ cursor: page.next_cursor });
}
```

Subscribe to local realtime events:

```ts
const sub = await products.subscribe((event) => {
  console.log(event.event, event.id, event.doc);
});

await sub.unsubscribe();
```

Document API limits come from Redge:

- Documents must be JSON objects.
- `PATCH` is a shallow merge.
- `where` supports equality filters only in v1.
- `limit` is capped by the server.
- Realtime events are local to one Redge instance.
