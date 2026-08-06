import { RedgeError } from "./errors";
import { normalizeBaseUrl } from "./http";
import type {
  RedgeWebSocket,
  RedgeWebSocketConstructor,
  Subscription,
  SubscriptionEvent
} from "./types";

interface SubscriptionRequest<TDoc> {
  baseUrl: string;
  token?: string;
  collection: string;
  WebSocketImpl?: RedgeWebSocketConstructor;
  handler: (event: SubscriptionEvent<TDoc>) => void;
  signal?: AbortSignal;
}

interface WSResponse {
  id?: string;
  ok?: boolean;
  subId?: string;
  error?: string;
  [key: string]: unknown;
}

export async function createSubscription<TDoc>(
  request: SubscriptionRequest<TDoc>
): Promise<Subscription> {
  const WebSocketImpl = request.WebSocketImpl ?? globalThis.WebSocket;
  if (!WebSocketImpl) {
    throw new RedgeError({
      code: "REDGE_WEBSOCKET_MISSING",
      message: "A WebSocket implementation is required for subscriptions"
    });
  }
  const ws = new WebSocketImpl(wsURL(request.baseUrl, request.token));
  const id = requestId();
  let subId = "";
  const pendingEvents: Array<SubscriptionEvent<TDoc>> = [];

  const opened = new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = (event: any) =>
      reject(
        new RedgeError({
          code: "REDGE_WEBSOCKET_ERROR",
          message: "WebSocket connection failed",
          details: event
        })
      );
  });

  const subscribed = new Promise<string>((resolve, reject) => {
    ws.onmessage = (event: any) => {
      const message = decodeMessage(event.data);
      if (message.id === id) {
        if (message.ok) {
          subId = String(message.subId ?? "");
          resolve(subId);
          return;
        }
        reject(
          new RedgeError({
            code: "REDGE_WEBSOCKET_RESPONSE_ERROR",
            message: message.error ?? "WebSocket subscribe failed",
            details: message
          })
        );
      }
      if (message.subId && typeof message.event === "string") {
        pendingEvents.push(message as unknown as SubscriptionEvent<TDoc>);
      }
    };
    ws.onclose = (event: any) => {
      reject(
        new RedgeError({
          code: "REDGE_WEBSOCKET_CLOSED",
          message: "WebSocket closed before subscription was acknowledged",
          details: event
        })
      );
    };
  });

  if (request.signal) {
    request.signal.addEventListener("abort", () => ws.close(1000, "aborted"), { once: true });
  }

  await opened;
  ws.send(JSON.stringify({ id, op: "subscribe", collection: request.collection }));
  await subscribed;

  ws.onmessage = (event: any) => {
    const message = decodeMessage(event.data);
    if (message.subId === subId && typeof message.event === "string") {
      request.handler(message as unknown as SubscriptionEvent<TDoc>);
    }
  };
  for (const event of pendingEvents) {
    if (event.subId === subId) {
      request.handler(event);
    }
  }

  return {
    get subId() {
      return subId;
    },
    async unsubscribe() {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ id: requestId(), op: "unsubscribe", subId }));
      }
      ws.close(1000, "unsubscribe");
    }
  };
}

function wsURL(baseUrl: string, token?: string): string {
  const base = normalizeBaseUrl(baseUrl);
  const url = new URL("/v1/ws", base + "/");
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  if (token) {
    url.searchParams.set("token", token);
  }
  return url.toString();
}

function decodeMessage(data: unknown): WSResponse {
  const text = typeof data === "string" ? data : String(data);
  try {
    return JSON.parse(text) as WSResponse;
  } catch (cause) {
    throw new RedgeError({
      code: "REDGE_INVALID_WEBSOCKET_MESSAGE",
      message: "Invalid WebSocket JSON message",
      cause
    });
  }
}

function requestId(): string {
  return `r_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}
