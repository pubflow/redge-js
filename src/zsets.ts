import { RedgeError } from "./errors";
import type { HttpClient } from "./http";
import type {
  RequestOptions,
  ZSetAddOptions,
  ZSetCardResult,
  ZSetCountResult,
  ZSetMutationResult,
  ZSetPublicRangeOptions,
  ZSetRangeResult,
  ZSetScoreRangeOptions,
  ZSetScoreResult
} from "./types";

export class ZSetsClient {
  constructor(private readonly http: HttpClient) {}

  add(
    key: string,
    member: string | Uint8Array,
    score: number,
    options: ZSetAddOptions = {}
  ): Promise<ZSetMutationResult> {
    return this.http.request<ZSetMutationResult>(`${this.keyPath(key)}/members`, {
      method: "POST",
      body: memberBody(member, score),
      query: { db: options.db },
      ...options
    });
  }

  range(key: string, options: ZSetPublicRangeOptions = {}): Promise<ZSetRangeResult> {
    return this.http.request<ZSetRangeResult>(`${this.keyPath(key)}/members`, {
      query: {
        db: options.db,
        start: options.start,
        stop: options.stop
      },
      ...options
    });
  }

  rangeByScore(key: string, options: ZSetScoreRangeOptions = {}): Promise<ZSetRangeResult> {
    return this.http.request<ZSetRangeResult>(`${this.keyPath(key)}/byscore`, {
      query: scoreRangeQuery(options),
      ...options
    });
  }

  remove(
    key: string,
    member: string,
    options: RequestOptions & { db?: number } = {}
  ): Promise<ZSetMutationResult> {
    assertTextMember(member);
    return this.http.request<ZSetMutationResult>(
      `${this.keyPath(key)}/members/${encodeURIComponent(member)}`,
      {
        method: "DELETE",
        query: { db: options.db },
        ...options
      }
    );
  }

  removeByScore(key: string, options: ZSetScoreRangeOptions = {}): Promise<ZSetMutationResult> {
    return this.http.request<ZSetMutationResult>(`${this.keyPath(key)}/byscore`, {
      method: "DELETE",
      query: scoreRangeQuery(options),
      ...options
    });
  }

  score(
    key: string,
    member: string,
    options: RequestOptions & { db?: number } = {}
  ): Promise<ZSetScoreResult> {
    assertTextMember(member);
    return this.http.request<ZSetScoreResult>(
      `${this.keyPath(key)}/score/${encodeURIComponent(member)}`,
      {
        query: { db: options.db },
        ...options
      }
    );
  }

  count(key: string, options: ZSetScoreRangeOptions = {}): Promise<ZSetCountResult> {
    return this.http.request<ZSetCountResult>(`${this.keyPath(key)}/count`, {
      query: scoreRangeQuery(options),
      ...options
    });
  }

  card(key: string, options: RequestOptions & { db?: number } = {}): Promise<ZSetCardResult> {
    return this.http.request<ZSetCardResult>(`${this.keyPath(key)}/card`, {
      query: { db: options.db },
      ...options
    });
  }

  private keyPath(key: string): string {
    if (!key) {
      throw new RedgeError({ code: "REDGE_INVALID_KEY", message: "zset key is required" });
    }
    return `/v1/zsets/${encodeURIComponent(key)}`;
  }
}

function memberBody(member: string | Uint8Array, score: number): Record<string, unknown> {
  if (typeof member === "string") {
    return { member, score };
  }
  return { member_base64: bytesToBase64(member), score };
}

function scoreRangeQuery(
  options: ZSetScoreRangeOptions
): Record<string, string | number | boolean | undefined> {
  return {
    db: options.db,
    min: options.min,
    max: options.max,
    offset: options.offset,
    limit: options.limit,
    rev: options.rev
  };
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

function assertTextMember(member: string): void {
  if (!member) {
    throw new RedgeError({ code: "REDGE_INVALID_MEMBER", message: "member is required" });
  }
}
