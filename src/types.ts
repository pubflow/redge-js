export type RedgeTransport = "auto" | "http" | "ws";

export type RedgeFetch = typeof fetch;

export type RedgeWebSocket = {
  readonly readyState: number;
  onopen: ((event: any) => void) | null;
  onmessage: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onclose: ((event: any) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
};

export type RedgeWebSocketConstructor = new (url: string) => RedgeWebSocket;

export interface RedgeClientOptions {
  baseUrl: string;
  token?: string;
  adminBaseUrl?: string;
  adminToken?: string;
  transport?: RedgeTransport;
  fetch?: RedgeFetch;
  WebSocket?: RedgeWebSocketConstructor;
  requestTimeoutMs?: number;
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface WriteOptions extends RequestOptions {
  ttl?: number;
  index?: string[];
  searchFields?: string[];
}

export interface IndexConfig {
  fields?: string[];
  searchFields?: string[];
}

export interface DocumentEnvelope<TDoc> {
  collection: string;
  id: string;
  version: number;
  created_at: string;
  updated_at: string;
  doc: TDoc;
}

export interface DeleteDocumentResult {
  collection: string;
  id: string;
  deleted: boolean;
}

export interface QueryWhere {
  field: string;
  op?: "eq" | string;
  value: string | number | boolean | null;
}

export interface QueryOptions extends RequestOptions {
  where?: QueryWhere | string;
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface QueryResult<TDoc> {
  collection: string;
  docs: Array<DocumentEnvelope<TDoc>>;
  next_cursor: string;
  has_more: boolean;
}

export type RedgeEventType = "insert" | "update" | "delete";

export interface SubscriptionEvent<TDoc> {
  subId: string;
  event: RedgeEventType;
  collection: string;
  id: string;
  doc?: TDoc;
}

export interface SubscriptionOptions {
  signal?: AbortSignal;
}

export interface Subscription {
  readonly subId: string;
  unsubscribe(): Promise<void>;
}

export interface AdminInfo {
  service: string;
  version: string;
  database: string;
  keys: number;
  admin_readonly: boolean;
}

export type CacheStats = Record<string, unknown>;

export interface KeyListOptions extends RequestOptions {
  db?: number;
  match?: string;
  cursor?: string;
  count?: number;
}

export interface KeyListResult {
  db: number;
  match: string;
  count: number;
  cursor: string;
  next_cursor: string;
  keys: string[];
}

export type KeyTTLState = "volatile" | "persistent" | "missing";

export interface KeyInfo {
  db: number;
  key: string;
  type: string;
  ttl_state: KeyTTLState;
  ttl_seconds?: number;
  value?: string;
  value_base64?: string;
  value_size?: number;
  version?: number;
  zcard?: number;
}

export type KVTTLState = "volatile" | "persistent" | "missing";

export interface KVValue {
  db: number;
  key: string;
  type: "string";
  value?: string;
  value_base64: string;
  value_size: number;
  ttl_state: KVTTLState;
  ttl_seconds?: number;
  version?: number;
  deleted?: boolean;
}

export interface KVGetOptions extends RequestOptions {
  db?: number;
}

export interface KVSetOptions extends RequestOptions {
  db?: number;
  ttlSeconds?: number;
  nx?: boolean;
  xx?: boolean;
  keepTTL?: boolean;
  get?: boolean;
}

export interface KVDeleteResult {
  db: number;
  key: string;
  deleted: number;
}

export interface KVMGetResult {
  db: number;
  keys: string[];
  values: Array<KVValue | null>;
}

export interface KVMSetItem {
  key: string;
  value: string | Uint8Array;
}

export interface KVMSetOptions extends RequestOptions {
  db?: number;
  ttlSeconds?: number;
  nx?: boolean;
  xx?: boolean;
}

export interface KVMSetResult {
  db: number;
  written: number;
}

export interface KVIncrOptions extends RequestOptions {
  db?: number;
  by?: number;
}

export interface KVIncrResult {
  db: number;
  key: string;
  value: number;
}

export interface KVExpireOptions extends RequestOptions {
  db?: number;
}

export interface KVExpireResult {
  db: number;
  key: string;
  changed: boolean;
}

export interface KVTtlResult {
  db: number;
  key: string;
  ttl_seconds?: number;
  ttl_state: KVTTLState;
}

export interface KVTypeResult {
  db: number;
  key: string;
  type: "none" | "string" | "zset";
}

export interface KVExistsResult {
  db: number;
  key: string;
  exists: boolean;
}

export interface KVMExistsItem {
  key: string;
  exists: boolean;
}

export interface KVMExistsResult {
  db: number;
  count: number;
  items: KVMExistsItem[];
}

export interface KVMDeleteResult {
  db: number;
  deleted: number;
}

export interface KVScanOptions extends RequestOptions {
  db?: number;
  match?: string;
  cursor?: string;
  limit?: number;
}

export interface KVScanResult {
  db: number;
  match: string;
  limit: number;
  cursor: string;
  next_cursor: string;
  keys: string[];
}

export interface DeleteKeyResult {
  db: number;
  key: string;
  deleted: number;
}

export interface ZSetRangeOptions extends RequestOptions {
  db?: number;
  start?: number;
  stop?: number;
}

export interface ZSetMember {
  member: string;
  member_base64: string;
  score: number;
}

export interface ZSetMutationResult {
  db: number;
  key: string;
  added?: number;
  removed?: number;
}

export interface ZSetAddItem {
  member: string | Uint8Array;
  score: number;
}

export interface ZSetAddOptions extends RequestOptions {
  db?: number;
}

export interface ZSetIncrByOptions extends RequestOptions {
  db?: number;
}

export interface ZSetIncrByResult {
  db: number;
  key: string;
  member?: string;
  member_base64?: string;
  score: number;
}

export interface ZSetPopOptions extends RequestOptions {
  db?: number;
  count?: number;
}

export interface ZSetPopResult {
  db: number;
  key: string;
  members: ZSetMember[];
}

export interface ZSetPublicRangeOptions extends RequestOptions {
  db?: number;
  start?: number;
  stop?: number;
}

export interface ZSetScoreRangeOptions extends RequestOptions {
  db?: number;
  min?: string | number;
  max?: string | number;
  offset?: number;
  limit?: number;
  rev?: boolean;
}

export interface ZSetRangeResult {
  db: number;
  key: string;
  start?: number;
  stop?: number;
  members: ZSetMember[];
}

export interface ZSetScoreResult {
  db: number;
  key: string;
  member: string;
  score: number;
}

export interface ZSetCountResult {
  db: number;
  key: string;
  count: number;
}

export interface ZSetCardResult {
  db: number;
  key: string;
  card: number;
}

export interface CleanupResult {
  deleted: number;
}
