import http from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WebSocket, WebSocketServer } from "ws";
import { createClient, RedgeError, type RedgeWebSocketConstructor } from "../src";

interface Product {
  id?: string;
  name: string;
  category: string;
  price?: number;
}

let server: http.Server;
let baseUrl: string;
const requests: Array<{ method: string; path: string; body?: unknown; auth?: string }> = [];

beforeEach(async () => {
  requests.length = 0;
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const body = await readJSON(req);
    requests.push({
      method: req.method ?? "GET",
      path: url.pathname + url.search,
      body,
      auth: req.headers.authorization
    });
    res.setHeader("Content-Type", "application/json");
    if (req.headers.authorization !== "Bearer test-token") {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "token required" }));
      return;
    }
    routeMock(req.method ?? "GET", url, body, res);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("test server failed to bind");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
});

describe("Document API client", () => {
  it("configures indexes and performs CRUD/query operations", async () => {
    const client = createClient({ baseUrl, token: "test-token" });
    const products = client.collection<Product>("products");

    await expect(
      products.configureIndexes({ fields: ["category"], searchFields: ["name"] })
    ).resolves.toEqual({ fields: ["category"], searchFields: ["name"] });

    const inserted = await products.insert(
      { id: "p1", name: "Blue Shirt", category: "apparel" },
      { ttl: 60, index: ["category"], searchFields: ["name"] }
    );
    expect(inserted.id).toBe("p1");
    expect(inserted.doc.name).toBe("Blue Shirt");

    const patched = await products.patch("p1", { price: 31 });
    expect(patched.doc.price).toBe(31);

    const found = await products.find({
      where: { field: "category", value: "apparel" },
      search: "Blue",
      limit: 10
    });
    expect(found.docs).toHaveLength(1);
    expect(found.docs[0]?.doc.category).toBe("apparel");

    expect(requests.map((request) => request.path)).toContain(
      "/v1/collections/products?ttl=60&index=category&searchField=name"
    );
    expect(requests.at(-1)?.path).toBe(
      "/v1/collections/products?where=category%3Aeq%3Aapparel&search=Blue&limit=10"
    );
  });

  it("throws RedgeError for HTTP errors", async () => {
    const client = createClient({ baseUrl, token: "wrong" });
    await expect(client.collection("products").get("p1")).rejects.toMatchObject({
      name: "RedgeError",
      status: 401,
      code: "REDGE_HTTP_ERROR"
    });
  });
});

describe("Admin API client", () => {
  it("lists, reads, and deletes keys through the admin API", async () => {
    const client = createClient({
      baseUrl,
      token: "test-token",
      adminBaseUrl: baseUrl,
      adminToken: "test-token"
    });

    await expect(client.admin.info()).resolves.toMatchObject({
      service: "redge",
      database: "sqlite"
    });
    await expect(client.admin.keys.list({ match: "session:*", count: 50 })).resolves.toMatchObject({
      keys: ["session:123"]
    });
    await expect(client.admin.keys.get("session:123")).resolves.toMatchObject({
      type: "string",
      value: "hello"
    });
    await expect(client.admin.zsets.range("rankings", { start: 0, stop: 1 })).resolves.toMatchObject({
      members: [{ member: "a", score: 1 }]
    });
    await expect(client.admin.keys.delete("session:123")).resolves.toMatchObject({
      deleted: 1
    });
    await expect(client.admin.cleanup()).resolves.toMatchObject({ deleted: 2 });
  });
});

describe("Store API client", () => {
  it("performs KV operations through the public Store API", async () => {
    const client = createClient({ baseUrl, token: "test-token" });

    await expect(client.kv.set("session:1", "hello", { ttlSeconds: 60 })).resolves.toMatchObject({
      key: "session:1",
      value: "hello",
      ttl_state: "volatile"
    });
    await expect(client.kv.set("bin", new Uint8Array([0, 255]))).resolves.toMatchObject({
      key: "bin",
      value_base64: "AP8="
    });
    await expect(client.kv.get("session:1")).resolves.toMatchObject({ value: "hello" });
    await expect(client.kv.mget(["session:1", "missing"])).resolves.toMatchObject({
      values: [{ key: "session:1" }, null]
    });
    await expect(client.kv.mset([{ key: "counter", value: "1" }])).resolves.toMatchObject({
      written: 1
    });
    await expect(client.kv.incr("counter", { by: 2 })).resolves.toMatchObject({ value: 3 });
    await expect(client.kv.expire("counter", 30)).resolves.toMatchObject({ changed: true });
    await expect(client.kv.persist("counter")).resolves.toMatchObject({ changed: true });
    await expect(client.kv.ttl("counter")).resolves.toMatchObject({ ttl_state: "persistent" });
    await expect(client.kv.scan({ match: "session:*", limit: 10 })).resolves.toMatchObject({
      keys: ["session:1"]
    });
    await expect(client.kv.getdel("session:1")).resolves.toMatchObject({ value: "hello" });
    await expect(client.kv.delete("session:1")).resolves.toMatchObject({ deleted: 1 });

    expect(requests.map((request) => request.path)).toContain("/v1/kv/session%3A1");
    expect(requests.find((request) => request.path === "/v1/kv/bin")?.body).toEqual({
      value_base64: "AP8="
    });
  });

  it("performs sorted set operations through the public Store API", async () => {
    const client = createClient({ baseUrl, token: "test-token" });

    await expect(client.zsets.add("rankings", "a", 1)).resolves.toMatchObject({ added: true });
    await expect(client.zsets.range("rankings", { start: 0, stop: 1 })).resolves.toMatchObject({
      members: [{ member: "a", score: 1 }]
    });
    await expect(
      client.zsets.rangeByScore("rankings", { min: 0, max: 2, limit: 10 })
    ).resolves.toMatchObject({
      members: [{ member: "a", score: 1 }]
    });
    await expect(client.zsets.score("rankings", "a")).resolves.toMatchObject({ score: 1 });
    await expect(client.zsets.count("rankings", { min: 0, max: 2 })).resolves.toMatchObject({
      count: 1
    });
    await expect(client.zsets.card("rankings")).resolves.toMatchObject({ card: 1 });
    await expect(client.zsets.remove("rankings", "a")).resolves.toMatchObject({ removed: 1 });
    await expect(client.zsets.removeByScore("rankings", { min: 0, max: 2 })).resolves.toMatchObject({
      removed: 1
    });
  });
});

describe("WebSocket subscriptions", () => {
  it("subscribes and receives local realtime events", async () => {
    const wsServer = new WebSocketServer({ noServer: true });
    server.on("upgrade", (req, socket, head) => {
      wsServer.handleUpgrade(req, socket, head, (ws) => wsServer.emit("connection", ws, req));
    });
    wsServer.on("connection", (ws, req) => {
      expect(new URL(req.url ?? "/", baseUrl).searchParams.get("token")).toBe("test-token");
      ws.on("message", (data) => {
        const msg = JSON.parse(String(data));
        ws.send(JSON.stringify({ id: msg.id, ok: true, subId: "sub_1" }));
        ws.send(
          JSON.stringify({
            subId: "sub_1",
            event: "insert",
            collection: "orders",
            id: "o1",
            doc: { status: "new" }
          })
        );
      });
    });

    const client = createClient({
      baseUrl,
      token: "test-token",
      WebSocket: WebSocket as unknown as RedgeWebSocketConstructor
    });
    const events: unknown[] = [];
    const sub = await client.collection("orders").subscribe((event) => events.push(event));

    await waitFor(() => events.length === 1);
    expect(sub.subId).toBe("sub_1");
    expect(events[0]).toMatchObject({ event: "insert", id: "o1" });
    await sub.unsubscribe();
    wsServer.close();
  });
});

async function readJSON(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return undefined;
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function routeMock(
  method: string,
  url: URL,
  body: unknown,
  res: http.ServerResponse
): void {
  if (method === "PUT" && url.pathname === "/v1/collections/products/indexes") {
    res.end(JSON.stringify(body));
    return;
  }
  if (method === "POST" && url.pathname === "/v1/collections/products") {
    res.writeHead(201);
    res.end(JSON.stringify(envelope("products", "p1", body)));
    return;
  }
  if (method === "PATCH" && url.pathname === "/v1/collections/products/p1") {
    res.end(JSON.stringify(envelope("products", "p1", { name: "Blue Shirt", category: "apparel", price: 31 })));
    return;
  }
  if (method === "GET" && url.pathname === "/v1/collections/products") {
    res.end(
      JSON.stringify({
        collection: "products",
        docs: [envelope("products", "p1", { name: "Blue Shirt", category: "apparel" })],
        next_cursor: "",
        has_more: false
      })
    );
    return;
  }
  if (method === "GET" && url.pathname === "/admin/v1/info") {
    res.end(JSON.stringify({ service: "redge", version: "0.1.0", database: "sqlite", keys: 1, admin_readonly: false }));
    return;
  }
  if (method === "GET" && url.pathname === "/admin/v1/keys") {
    res.end(JSON.stringify({ db: 0, match: "session:*", count: 50, cursor: "0", next_cursor: "0", keys: ["session:123"] }));
    return;
  }
  if (method === "GET" && url.pathname === "/admin/v1/keys/session%3A123") {
    res.end(JSON.stringify({ db: 0, key: "session:123", type: "string", ttl_state: "persistent", value: "hello", value_size: 5 }));
    return;
  }
  if (method === "DELETE" && url.pathname === "/admin/v1/keys/session%3A123") {
    res.end(JSON.stringify({ db: 0, key: "session:123", deleted: 1 }));
    return;
  }
  if (method === "GET" && url.pathname === "/admin/v1/zsets/rankings") {
    res.end(JSON.stringify({ db: 0, key: "rankings", start: 0, stop: 1, members: [{ member: "a", member_base64: "YQ", score: 1 }] }));
    return;
  }
  if (method === "POST" && url.pathname === "/admin/v1/cleanup") {
    res.end(JSON.stringify({ deleted: 2 }));
    return;
  }
  if (method === "PUT" && url.pathname === "/v1/kv/session%3A1") {
    res.end(JSON.stringify(kvValue("session:1", "hello", "aGVsbG8=", "volatile")));
    return;
  }
  if (method === "PUT" && url.pathname === "/v1/kv/bin") {
    res.end(JSON.stringify(kvValue("bin", undefined, "AP8=", "persistent")));
    return;
  }
  if (method === "GET" && url.pathname === "/v1/kv/session%3A1") {
    res.end(JSON.stringify(kvValue("session:1", "hello", "aGVsbG8=", "persistent")));
    return;
  }
  if (method === "POST" && url.pathname === "/v1/kv/batch/get") {
    res.end(JSON.stringify({ db: 0, keys: ["session:1", "missing"], values: [kvValue("session:1", "hello", "aGVsbG8=", "persistent"), null] }));
    return;
  }
  if (method === "POST" && url.pathname === "/v1/kv/batch/set") {
    res.end(JSON.stringify({ db: 0, written: 1 }));
    return;
  }
  if (method === "POST" && url.pathname === "/v1/kv/counter/incr") {
    res.end(JSON.stringify({ db: 0, key: "counter", value: 3 }));
    return;
  }
  if (method === "POST" && url.pathname === "/v1/kv/counter/expire") {
    res.end(JSON.stringify({ db: 0, key: "counter", changed: true }));
    return;
  }
  if (method === "POST" && url.pathname === "/v1/kv/counter/persist") {
    res.end(JSON.stringify({ db: 0, key: "counter", changed: true }));
    return;
  }
  if (method === "GET" && url.pathname === "/v1/kv/counter/ttl") {
    res.end(JSON.stringify({ db: 0, key: "counter", ttl_state: "persistent" }));
    return;
  }
  if (method === "GET" && url.pathname === "/v1/kv") {
    res.end(JSON.stringify({ db: 0, match: "session:*", limit: 10, cursor: "0", next_cursor: "0", keys: ["session:1"] }));
    return;
  }
  if (method === "POST" && url.pathname === "/v1/kv/session%3A1/getdel") {
    res.end(JSON.stringify(kvValue("session:1", "hello", "aGVsbG8=", "persistent")));
    return;
  }
  if (method === "DELETE" && url.pathname === "/v1/kv/session%3A1") {
    res.end(JSON.stringify({ db: 0, key: "session:1", deleted: 1 }));
    return;
  }
  if (method === "POST" && url.pathname === "/v1/zsets/rankings/members") {
    res.end(JSON.stringify({ db: 0, key: "rankings", added: true }));
    return;
  }
  if (method === "GET" && url.pathname === "/v1/zsets/rankings/members") {
    res.end(JSON.stringify({ db: 0, key: "rankings", start: 0, stop: 1, members: [{ member: "a", member_base64: "YQ==", score: 1 }] }));
    return;
  }
  if (method === "GET" && url.pathname === "/v1/zsets/rankings/byscore") {
    res.end(JSON.stringify({ db: 0, key: "rankings", members: [{ member: "a", member_base64: "YQ==", score: 1 }] }));
    return;
  }
  if (method === "GET" && url.pathname === "/v1/zsets/rankings/score/a") {
    res.end(JSON.stringify({ db: 0, key: "rankings", member: "a", score: 1 }));
    return;
  }
  if (method === "GET" && url.pathname === "/v1/zsets/rankings/count") {
    res.end(JSON.stringify({ db: 0, key: "rankings", count: 1 }));
    return;
  }
  if (method === "GET" && url.pathname === "/v1/zsets/rankings/card") {
    res.end(JSON.stringify({ db: 0, key: "rankings", card: 1 }));
    return;
  }
  if (method === "DELETE" && url.pathname === "/v1/zsets/rankings/members/a") {
    res.end(JSON.stringify({ db: 0, key: "rankings", removed: 1 }));
    return;
  }
  if (method === "DELETE" && url.pathname === "/v1/zsets/rankings/byscore") {
    res.end(JSON.stringify({ db: 0, key: "rankings", removed: 1 }));
    return;
  }
  res.writeHead(404);
  res.end(JSON.stringify({ error: "not found" }));
}

function kvValue(key: string, value: string | undefined, value_base64: string, ttl_state: string) {
  return {
    db: 0,
    key,
    type: "string",
    value,
    value_base64,
    value_size: value?.length ?? 2,
    ttl_state,
    ttl_seconds: ttl_state === "volatile" ? 60 : undefined,
    version: 1
  };
}

function envelope(collection: string, id: string, doc: unknown) {
  return {
    collection,
    id,
    version: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    doc
  };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new RedgeError({ code: "TEST_TIMEOUT", message: "waitFor timed out" });
}
