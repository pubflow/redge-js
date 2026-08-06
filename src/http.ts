import { RedgeError } from "./errors";
import type { RedgeFetch, RequestOptions } from "./types";

export interface HttpClientOptions {
  baseUrl: string;
  token?: string;
  fetchImpl?: RedgeFetch;
  requestTimeoutMs?: number;
}

export interface HttpRequestOptions extends RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
  query?: Record<string, string | number | boolean | null | undefined>;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly fetchImpl: RedgeFetch;
  private readonly requestTimeoutMs: number;

  constructor(options: HttpClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30000;
    if (!this.fetchImpl) {
      throw new RedgeError({
        code: "REDGE_FETCH_MISSING",
        message: "A fetch implementation is required in this environment"
      });
    }
  }

  async request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    const timeoutMs = options.timeoutMs ?? this.requestTimeoutMs;
    const controller = options.signal ? undefined : new AbortController();
    const timeout = controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;
    const signal = options.signal ?? controller?.signal;
    try {
      const response = await this.fetchImpl(this.url(path, options.query), {
        method: options.method ?? "GET",
        headers: this.headers(options),
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal
      });
      return await parseResponse<T>(response);
    } catch (error) {
      if (error instanceof RedgeError) {
        throw error;
      }
      throw new RedgeError({
        code: "REDGE_NETWORK_ERROR",
        message: error instanceof Error ? error.message : "Redge request failed",
        cause: error
      });
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private url(path: string, query?: HttpRequestOptions["query"]): string {
    const url = new URL(path, this.baseUrl + "/");
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private headers(options: HttpRequestOptions): Headers {
    const headers = new Headers();
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    const token = options.token ?? this.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  }
}

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new RedgeError({
      code: "REDGE_INVALID_BASE_URL",
      message: "baseUrl is required"
    });
  }
  return trimmed.replace(/\/+$/, "");
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? safeJSON(text) : undefined;
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Redge request failed with HTTP ${response.status}`;
    throw new RedgeError({
      status: response.status,
      code: "REDGE_HTTP_ERROR",
      message,
      details: body
    });
  }
  return body as T;
}

function safeJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
