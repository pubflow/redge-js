import { AdminClient } from "./admin";
import { CollectionClient } from "./collection";
import { HttpClient, normalizeBaseUrl } from "./http";
import { KVClient } from "./kv";
import type { RedgeClientOptions, RedgeTransport } from "./types";
import { ZSetsClient } from "./zsets";

export class RedgeClient {
  readonly admin: AdminClient;
  readonly kv: KVClient;
  readonly zsets: ZSetsClient;
  readonly transport: RedgeTransport;
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly WebSocketImpl?: RedgeClientOptions["WebSocket"];
  private readonly docsHttp: HttpClient;

  constructor(options: RedgeClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.token = options.token;
    this.transport = options.transport ?? "auto";
    this.WebSocketImpl = options.WebSocket;
    this.docsHttp = new HttpClient({
      baseUrl: this.baseUrl,
      token: options.token,
      fetchImpl: options.fetch,
      requestTimeoutMs: options.requestTimeoutMs
    });
    const adminHttp = new HttpClient({
      baseUrl: normalizeBaseUrl(options.adminBaseUrl ?? options.baseUrl),
      token: options.adminToken ?? options.token,
      fetchImpl: options.fetch,
      requestTimeoutMs: options.requestTimeoutMs
    });
    this.admin = new AdminClient(adminHttp, options.adminToken ?? options.token);
    this.kv = new KVClient(this.docsHttp);
    this.zsets = new ZSetsClient(this.docsHttp);
  }

  collection<TDoc extends object = Record<string, unknown>>(
    name: string
  ): CollectionClient<TDoc> {
    return new CollectionClient<TDoc>({
      http: this.docsHttp,
      collection: name,
      token: this.token,
      baseUrl: this.baseUrl,
      WebSocketImpl: this.WebSocketImpl
    });
  }
}

export function createClient(options: RedgeClientOptions): RedgeClient {
  return new RedgeClient(options);
}
