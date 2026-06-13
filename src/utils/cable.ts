/**
 * CableClient — singleton ActionCable client for Hatiwal.
 *
 * ONE WebSocket per session, multiplexes all channel subscriptions.
 * Auto-reconnects with exponential back-off (1 s → 2 s → 4 s → 8 s max).
 * Fully decoupled from React — any module can subscribe; hooks are thin wrappers.
 *
 * ActionCable wire protocol (server → client)
 * ───────────────────────────────────────────
 * { type: "welcome" }
 * { type: "ping", message: <epoch> }          ← server keepalive, client ignores
 * { type: "confirm_subscription", identifier }
 * { type: "reject_subscription",  identifier }
 * { identifier, message: <payload> }           ← data frame
 *
 * ActionCable wire protocol (client → server)
 * ───────────────────────────────────────────
 * { command: "subscribe",   identifier: '{"channel":"X",...}' }
 * { command: "unsubscribe", identifier }
 * { command: "message",     identifier, data }
 */

import { secureStorage } from "@/utils/secure-storage";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CablePayload = Record<string, unknown>;
export type MessageHandler = (payload: CablePayload) => void;

interface Subscription {
  identifier: string;
  handlers: Set<MessageHandler>;
  confirmed: boolean;
}

type ConnectionState = "disconnected" | "connecting" | "connected";

// ─── URL helper ──────────────────────────────────────────────────────────────

const CABLE_BASE =
  process.env.EXPO_PUBLIC_CABLE_URL ?? "ws://localhost:3098/hatiwal-cable";

function buildCableUrl(accessToken: string, client: string, uid: string): string {
  return (
    `${CABLE_BASE}` +
    `?access_token=${encodeURIComponent(accessToken)}` +
    `&client=${encodeURIComponent(client)}` +
    `&uid=${encodeURIComponent(uid)}`
  );
}

// ─── CableClient ─────────────────────────────────────────────────────────────

class CableClient {
  private ws: WebSocket | null = null;
  private state: ConnectionState = "disconnected";
  private subscriptions = new Map<string, Subscription>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;

  // ── Public API ─────────────────────────────────────────────────────────────

  subscribe(channelParams: Record<string, unknown>, handler: MessageHandler): () => void {
    const identifier = JSON.stringify(channelParams);

    if (!this.subscriptions.has(identifier)) {
      this.subscriptions.set(identifier, { identifier, handlers: new Set(), confirmed: false });
    }
    this.subscriptions.get(identifier)!.handlers.add(handler);

    if (this.state === "connected") {
      this.sendSubscribe(identifier);
    } else {
      this.ensureConnected();
    }

    return () => this.unsubscribe(identifier, handler);
  }

  disconnect() {
    this.state = "disconnected";
    this.clearReconnect();
    this.subscriptions.clear();
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      try { ws.close(); } catch { /* ignore */ }
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

    // Guard: disconnect() may have been called while we were awaiting
    if (this.state === "disconnected") return;

    if (!accessToken || !client || !uid) {
      this.state = "disconnected";
      return;
    }

    const url = buildCableUrl(accessToken, client, uid);
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      // Nothing — wait for server "welcome" frame before doing anything
    };

    ws.onmessage = (event) => {
      this.handleFrame(event.data as string);
    };

    ws.onerror = (err) => {
      console.warn("[CableClient] WebSocket error", err);
      // Let onclose handle cleanup and reconnect
    };

    ws.onclose = (event) => {
      if (this.ws === ws) this.ws = null;
      if (this.state !== "disconnected") {
        this.state = "disconnected";
        // Mark all subscriptions as unconfirmed so they'll re-subscribe on reconnect
        for (const sub of this.subscriptions.values()) {
          sub.confirmed = false;
        }
        this.scheduleReconnect();
      }
    };
  }

  private handleFrame(raw: string) {
    let frame: Record<string, unknown>;
    try { frame = JSON.parse(raw); } catch { return; }

    const type = frame.type as string | undefined;

    // Server keepalive — ignore at message level (WebSocket handles ping/pong at protocol level)
    if (type === "ping") return;

    if (type === "welcome") {
      this.state = "connected";
      this.reconnectDelay = 1000;
      for (const sub of this.subscriptions.values()) {
        this.sendSubscribe(sub.identifier);
      }
      return;
    }

    if (type === "confirm_subscription") {
      const identifier = frame.identifier as string | undefined;
      if (identifier) {
        const sub = this.subscriptions.get(identifier);
        if (sub) sub.confirmed = true;
      }
      return;
    }

    if (type === "reject_subscription") {
      const identifier = frame.identifier as string | undefined;
      console.warn("[CableClient] Subscription rejected:", identifier);
      if (identifier) {
        // Remove from map so it doesn't keep retrying silently
        this.subscriptions.delete(identifier);
      }
      return;
    }

    // Data frame
    const identifier = frame.identifier as string | undefined;
    const message = frame.message as CablePayload | undefined;
    if (identifier && message) {
      const sub = this.subscriptions.get(identifier);
      if (sub) {
        sub.handlers.forEach((h) => {
          try { h(message); } catch { /* handler errors must not crash the loop */ }
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
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 8000);
  }

  private clearReconnect() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const cableClient = new CableClient();
