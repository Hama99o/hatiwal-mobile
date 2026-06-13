/**
 * CableClient — singleton ActionCable client for Hatiwal.
 *
 * Design goals
 * ────────────
 * • ONE WebSocket per app session regardless of how many channels are active.
 *   ActionCable multiplexes all subscriptions over a single connection.
 * • Zero external packages — built on React Native's native WebSocket.
 * • Auto-reconnect with capped back-off (1s → 2s → 4s → 8s max).
 * • Ping every 20 s to survive mobile NAT keepalive timeouts.
 * • Fully decoupled from React — any module can subscribe; hooks are a thin wrapper.
 * • Handles logout/login by disconnecting and reconnecting with fresh tokens.
 *
 * ActionCable wire protocol
 * ─────────────────────────
 * server → { type: "welcome" }
 * client → { command: "subscribe",   identifier: '{"channel":"X",...}' }
 * server → { type: "confirm_subscription", identifier }
 * server → { identifier, message: <payload> }
 * server → { type: "ping" }      (ignored)
 * client → { command: "unsubscribe", identifier }
 */

import { secureStorage } from "@/utils/secure-storage";
import { BASE_URL } from "@/api/http";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CablePayload = Record<string, unknown>;
export type MessageHandler = (payload: CablePayload) => void;

interface Subscription {
  identifier: string;
  handlers: Set<MessageHandler>;
}

type ConnectionState = "disconnected" | "connecting" | "connected";

// ─── URL helper ──────────────────────────────────────────────────────────────

function buildCableUrl(accessToken: string, client: string, uid: string): string {
  // Strip /api/v1 suffix to get the Rails root, then switch http→ws
  const root = BASE_URL.replace(/\/api\/v1\/?$/, "").replace(/^http/, "ws");
  return (
    `${root}/hatiwal-cable` +
    `?access_token=${encodeURIComponent(accessToken)}` +
    `&client=${encodeURIComponent(client)}` +
    `&uid=${encodeURIComponent(uid)}`
  );
}

// ─── CableClient ─────────────────────────────────────────────────────────────

class CableClient {
  private ws: WebSocket | null = null;
  private state: ConnectionState = "disconnected";

  // Map of identifier → subscription (handlers set)
  private subscriptions = new Map<string, Subscription>();

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000; // ms, doubles on each failure, capped at 8000

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to a channel. Returns a cleanup function — call it to unsubscribe.
   * Safe to call before the connection is established; subscription is queued.
   *
   * @example
   * const unsub = cableClient.subscribe(
   *   { channel: "ConversationChannel", conversation_id: 42 },
   *   (payload) => console.log(payload.message)
   * );
   * // later:
   * unsub();
   */
  subscribe(channelParams: Record<string, unknown>, handler: MessageHandler): () => void {
    const identifier = JSON.stringify(channelParams);

    if (!this.subscriptions.has(identifier)) {
      this.subscriptions.set(identifier, { identifier, handlers: new Set() });
    }
    this.subscriptions.get(identifier)!.handlers.add(handler);

    // Send subscribe command if we're already connected
    if (this.state === "connected") {
      this.sendSubscribe(identifier);
    } else {
      this.ensureConnected();
    }

    return () => this.unsubscribe(identifier, handler);
  }

  /**
   * Call on logout so the connection is torn down and tokens are discarded.
   * On the next subscribe() call the client will reconnect with fresh tokens.
   */
  disconnect() {
    this.state = "disconnected";
    this.clearTimers();
    this.subscriptions.clear();
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
  }

  // ── Private: lifecycle ─────────────────────────────────────────────────────

  private ensureConnected() {
    if (this.state !== "disconnected") return;
    this.state = "connecting";
    this.openSocket();
  }

  private async openSocket() {
    const accessToken = await secureStorage.getItem("access-token");
    const client = await secureStorage.getItem("client");
    const uid = await secureStorage.getItem("uid");

    if (!accessToken || !client || !uid) {
      // No credentials — wait; subscribe() will be retried by the caller
      this.state = "disconnected";
      return;
    }

    const url = buildCableUrl(accessToken, client, uid);
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      // Do nothing here — wait for the "welcome" frame before subscribing
    };

    ws.onmessage = (event) => {
      this.handleFrame(event.data as string);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onclose = () => {
      this.ws = null;
      this.clearPing();
      if (this.state !== "disconnected") {
        this.state = "disconnected";
        this.scheduleReconnect();
      }
    };
  }

  private handleFrame(raw: string) {
    let frame: Record<string, unknown>;
    try { frame = JSON.parse(raw); } catch { return; }

    const type = frame.type as string | undefined;

    if (type === "ping") return;

    if (type === "welcome") {
      this.state = "connected";
      this.reconnectDelay = 1000; // reset back-off on successful connect
      this.schedulePing();
      // Re-subscribe all existing subscriptions
      for (const sub of this.subscriptions.values()) {
        this.sendSubscribe(sub.identifier);
      }
      return;
    }

    if (type === "confirm_subscription" || type === "reject_subscription") return;

    // Data frame — route to the right handlers
    const identifier = frame.identifier as string | undefined;
    const message = frame.message as CablePayload | undefined;
    if (identifier && message) {
      const sub = this.subscriptions.get(identifier);
      if (sub) {
        sub.handlers.forEach((h) => {
          try { h(message); } catch { /* handler errors must not break the loop */ }
        });
      }
    }
  }

  // ── Private: subscribe / unsubscribe ───────────────────────────────────────

  private sendSubscribe(identifier: string) {
    this.send({ command: "subscribe", identifier });
  }

  private unsubscribe(identifier: string, handler: MessageHandler) {
    const sub = this.subscriptions.get(identifier);
    if (!sub) return;

    sub.handlers.delete(handler);

    if (sub.handlers.size === 0) {
      this.subscriptions.delete(identifier);
      // Only send unsubscribe if connected — otherwise the server already cleaned up
      if (this.state === "connected") {
        this.send({ command: "unsubscribe", identifier });
      }
    }
  }

  // ── Private: helpers ───────────────────────────────────────────────────────

  private send(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify(data)); } catch { /* ignore */ }
    }
  }

  private scheduleReconnect() {
    this.clearReconnect();
    this.reconnectTimer = setTimeout(() => {
      this.state = "connecting";
      this.openSocket();
    }, this.reconnectDelay);
    // Double delay, cap at 8 s
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 8000);
  }

  private schedulePing() {
    this.clearPing();
    this.pingTimer = setTimeout(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // ActionCable expects a ping echo but we just send a no-op message
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
      this.schedulePing();
    }, 20_000);
  }

  private clearTimers() {
    this.clearReconnect();
    this.clearPing();
  }

  private clearReconnect() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearPing() {
    if (this.pingTimer !== null) {
      clearTimeout(this.pingTimer);
      this.pingTimer = null;
    }
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const cableClient = new CableClient();
