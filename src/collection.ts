import { RedgeError } from "./errors";
import type { HttpClient } from "./http";
import type {
  DeleteDocumentResult,
  DocumentEnvelope,
  IndexConfig,
  QueryOptions,
  QueryResult,
  QueryWhere,
  RedgeWebSocketConstructor,
  Subscription,
  SubscriptionEvent,
  SubscriptionOptions,
  WriteOptions
} from "./types";
import { createSubscription } from "./websocket";

export class CollectionClient<TDoc extends object = Record<string, unknown>> {
  private readonly http: HttpClient;
  private readonly collection: string;
  private readonly token?: string;
  private readonly baseUrl: string;
  private readonly WebSocketImpl?: RedgeWebSocketConstructor;

  constructor(options: {
    http: HttpClient;
    collection: string;
    token?: string;
    baseUrl: string;
    WebSocketImpl?: RedgeWebSocketConstructor;
  }) {
    assertName(options.collection, "collection");
    this.http = options.http;
    this.collection = options.collection;
    this.token = options.token;
    this.baseUrl = options.baseUrl;
    this.WebSocketImpl = options.WebSocketImpl;
  }

  configureIndexes(config: IndexConfig, options?: WriteOptions): Promise<IndexConfig> {
    return this.http.request<IndexConfig>(this.indexPath(), {
      method: "PUT",
      body: config,
      ...options
    });
  }

  getIndexes(options?: WriteOptions): Promise<IndexConfig> {
    return this.http.request<IndexConfig>(this.indexPath(), options);
  }

  insert(doc: TDoc, options?: WriteOptions): Promise<DocumentEnvelope<TDoc>> {
    return this.http.request<DocumentEnvelope<TDoc>>(this.collectionPath(), {
      method: "POST",
      body: doc,
      query: writeQuery(options),
      ...options
    });
  }

  get(id: string, options?: WriteOptions): Promise<DocumentEnvelope<TDoc>> {
    assertName(id, "document id");
    return this.http.request<DocumentEnvelope<TDoc>>(this.documentPath(id), options);
  }

  upsert(id: string, doc: TDoc, options?: WriteOptions): Promise<DocumentEnvelope<TDoc>> {
    assertName(id, "document id");
    return this.http.request<DocumentEnvelope<TDoc>>(this.documentPath(id), {
      method: "PUT",
      body: doc,
      query: writeQuery(options),
      ...options
    });
  }

  patch(id: string, patch: Partial<TDoc>, options?: WriteOptions): Promise<DocumentEnvelope<TDoc>> {
    assertName(id, "document id");
    return this.http.request<DocumentEnvelope<TDoc>>(this.documentPath(id), {
      method: "PATCH",
      body: patch,
      query: writeQuery(options),
      ...options
    });
  }

  delete(id: string, options?: WriteOptions): Promise<DeleteDocumentResult> {
    assertName(id, "document id");
    return this.http.request<DeleteDocumentResult>(this.documentPath(id), {
      method: "DELETE",
      ...options
    });
  }

  find(options: QueryOptions = {}): Promise<QueryResult<TDoc>> {
    return this.http.request<QueryResult<TDoc>>(this.collectionPath(), {
      query: queryParams(options),
      ...options
    });
  }

  search(text: string, options: Omit<QueryOptions, "search"> = {}): Promise<QueryResult<TDoc>> {
    return this.find({ ...options, search: text });
  }

  subscribe(
    handler: (event: SubscriptionEvent<TDoc>) => void,
    options: SubscriptionOptions = {}
  ): Promise<Subscription> {
    return createSubscription<TDoc>({
      baseUrl: this.baseUrl,
      token: this.token,
      collection: this.collection,
      WebSocketImpl: this.WebSocketImpl,
      handler,
      signal: options.signal
    });
  }

  private collectionPath(): string {
    return `/v1/collections/${encodeURIComponent(this.collection)}`;
  }

  private documentPath(id: string): string {
    return `${this.collectionPath()}/${encodeURIComponent(id)}`;
  }

  private indexPath(): string {
    return `${this.collectionPath()}/indexes`;
  }
}

function writeQuery(options?: WriteOptions): Record<string, string | number | undefined> {
  return {
    ttl: options?.ttl,
    index: options?.index?.join(","),
    searchField: options?.searchFields?.join(",")
  };
}

function queryParams(options: QueryOptions): Record<string, string | number | undefined> {
  return {
    where: encodeWhere(options.where),
    search: options.search,
    limit: options.limit,
    cursor: options.cursor
  };
}

function encodeWhere(where?: QueryWhere | string): string | undefined {
  if (!where) {
    return undefined;
  }
  if (typeof where === "string") {
    return where;
  }
  return `${where.field}:${where.op ?? "eq"}:${String(where.value)}`;
}

function assertName(value: string, label: string): void {
  if (!/^[A-Za-z0-9_-]{1,191}$/.test(value)) {
    throw new RedgeError({
      code: "REDGE_INVALID_NAME",
      message: `Invalid ${label}: ${value}`
    });
  }
}
