import { RedgeError } from "./errors";
import type { HttpClient } from "./http";
import type {
  KVDeleteResult,
  KVExpireOptions,
  KVExpireResult,
  KVGetOptions,
  KVIncrOptions,
  KVIncrResult,
  KVMGetResult,
  KVMSetItem,
  KVMSetOptions,
  KVMSetResult,
  KVScanOptions,
  KVScanResult,
  KVSetOptions,
  KVTtlResult,
  KVValue,
  RequestOptions
} from "./types";

export class KVClient {
  constructor(private readonly http: HttpClient) {}

  get(key: string, options: KVGetOptions = {}): Promise<KVValue> {
    return this.http.request<KVValue>(this.keyPath(key), {
      query: { db: options.db },
      ...options
    });
  }

  set(key: string, value: string | Uint8Array, options: KVSetOptions = {}): Promise<KVValue> {
    return this.http.request<KVValue>(this.keyPath(key), {
      method: "PUT",
      body: valueBody(value, {
        ttl_seconds: options.ttlSeconds,
        nx: options.nx,
        xx: options.xx,
        keep_ttl: options.keepTTL,
        get: options.get
      }),
      query: { db: options.db },
      ...options
    });
  }

  delete(key: string, options: KVGetOptions = {}): Promise<KVDeleteResult> {
    return this.http.request<KVDeleteResult>(this.keyPath(key), {
      method: "DELETE",
      query: { db: options.db },
      ...options
    });
  }

  mget(keys: string[], options: KVGetOptions = {}): Promise<KVMGetResult> {
    return this.http.request<KVMGetResult>("/v1/kv/batch/get", {
      method: "POST",
      body: { keys },
      query: { db: options.db },
      ...options
    });
  }

  mset(items: KVMSetItem[], options: KVMSetOptions = {}): Promise<KVMSetResult> {
    return this.http.request<KVMSetResult>("/v1/kv/batch/set", {
      method: "POST",
      body: {
        items: items.map((item) => ({ key: item.key, ...valueBody(item.value) })),
        ttl_seconds: options.ttlSeconds,
        nx: options.nx,
        xx: options.xx
      },
      query: { db: options.db },
      ...options
    });
  }

  getdel(key: string, options: KVGetOptions = {}): Promise<KVValue> {
    return this.http.request<KVValue>(`${this.keyPath(key)}/getdel`, {
      method: "POST",
      query: { db: options.db },
      ...options
    });
  }

  incr(key: string, options: KVIncrOptions = {}): Promise<KVIncrResult> {
    return this.http.request<KVIncrResult>(`${this.keyPath(key)}/incr`, {
      method: "POST",
      body: { by: options.by },
      query: { db: options.db },
      ...options
    });
  }

  expire(key: string, ttlSeconds: number, options: KVExpireOptions = {}): Promise<KVExpireResult> {
    return this.http.request<KVExpireResult>(`${this.keyPath(key)}/expire`, {
      method: "POST",
      body: { ttl_seconds: ttlSeconds },
      query: { db: options.db },
      ...options
    });
  }

  persist(key: string, options: KVGetOptions = {}): Promise<KVExpireResult> {
    return this.http.request<KVExpireResult>(`${this.keyPath(key)}/persist`, {
      method: "POST",
      query: { db: options.db },
      ...options
    });
  }

  ttl(key: string, options: KVGetOptions = {}): Promise<KVTtlResult> {
    return this.http.request<KVTtlResult>(`${this.keyPath(key)}/ttl`, {
      query: { db: options.db },
      ...options
    });
  }

  scan(options: KVScanOptions = {}): Promise<KVScanResult> {
    return this.http.request<KVScanResult>("/v1/kv", {
      query: {
        db: options.db,
        match: options.match,
        cursor: options.cursor,
        limit: options.limit
      },
      ...options
    });
  }

  private keyPath(key: string): string {
    assertKey(key);
    return `/v1/kv/${encodeURIComponent(key)}`;
  }
}

function valueBody(
  value: string | Uint8Array,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  if (typeof value === "string") {
    return { value, ...stripUndefined(extra) };
  }
  return { value_base64: bytesToBase64(value), ...stripUndefined(extra) };
}

function bytesToBase64(bytes: Uint8Array): string {
  const maybeBuffer = (globalThis as unknown as { Buffer?: typeof Buffer }).Buffer;
  if (maybeBuffer) {
    return maybeBuffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function stripUndefined(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function assertKey(key: string): void {
  if (!key) {
    throw new RedgeError({ code: "REDGE_INVALID_KEY", message: "key is required" });
  }
}

export type { RequestOptions };
