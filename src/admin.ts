import type { HttpClient } from "./http";
import type {
  AdminInfo,
  CacheStats,
  CleanupResult,
  DeleteKeyResult,
  KeyInfo,
  KeyListOptions,
  KeyListResult,
  RequestOptions,
  ZSetRangeOptions,
  ZSetRangeResult
} from "./types";

export class AdminClient {
  readonly keys: AdminKeysClient;
  readonly zsets: AdminZSetsClient;
  private readonly http: HttpClient;
  private readonly token?: string;

  constructor(http: HttpClient, token?: string) {
    this.http = http;
    this.token = token;
    this.keys = new AdminKeysClient(http, token);
    this.zsets = new AdminZSetsClient(http, token);
  }

  info(options?: RequestOptions): Promise<AdminInfo> {
    return this.http.request<AdminInfo>("/admin/v1/info", { token: this.token, ...options });
  }

  cache(options?: RequestOptions): Promise<CacheStats> {
    return this.http.request<CacheStats>("/admin/v1/cache", { token: this.token, ...options });
  }

  cleanup(options?: RequestOptions): Promise<CleanupResult> {
    return this.http.request<CleanupResult>("/admin/v1/cleanup", {
      method: "POST",
      token: this.token,
      ...options
    });
  }
}

export class AdminKeysClient {
  constructor(
    private readonly http: HttpClient,
    private readonly token?: string
  ) {}

  list(options: KeyListOptions = {}): Promise<KeyListResult> {
    return this.http.request<KeyListResult>("/admin/v1/keys", {
      token: this.token,
      query: {
        db: options.db,
        match: options.match,
        cursor: options.cursor,
        count: options.count
      },
      ...options
    });
  }

  get(key: string, options: RequestOptions & { db?: number } = {}): Promise<KeyInfo> {
    return this.http.request<KeyInfo>(`/admin/v1/keys/${encodeURIComponent(key)}`, {
      token: this.token,
      query: { db: options.db },
      ...options
    });
  }

  delete(key: string, options: RequestOptions & { db?: number } = {}): Promise<DeleteKeyResult> {
    return this.http.request<DeleteKeyResult>(`/admin/v1/keys/${encodeURIComponent(key)}`, {
      method: "DELETE",
      token: this.token,
      query: { db: options.db },
      ...options
    });
  }
}

export class AdminZSetsClient {
  constructor(
    private readonly http: HttpClient,
    private readonly token?: string
  ) {}

  range(key: string, options: ZSetRangeOptions = {}): Promise<ZSetRangeResult> {
    return this.http.request<ZSetRangeResult>(`/admin/v1/zsets/${encodeURIComponent(key)}`, {
      token: this.token,
      query: {
        db: options.db,
        start: options.start,
        stop: options.stop
      },
      ...options
    });
  }
}
