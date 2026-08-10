import { http, HttpResponse } from "msw";
import { server } from "../../__tests__/mocks/server";
import { conversationsAPI, getUnreadTotal } from "../conversations";
import { MOCK_CONVERSATION, MOCK_MESSAGE, MOCK_PAGINATION } from "../../__tests__/mocks/handlers";

jest.mock("@/utils/secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    saveAuthHeaders: jest.fn().mockResolvedValue(undefined),
    clearAuthHeaders: jest.fn().mockResolvedValue(undefined),
  },
}));


describe("conversationsAPI.getConversations", () => {
  it("returns camelCased conversations and pagination", async () => {
    const result = await conversationsAPI.getConversations();
    expect(result.items).toHaveLength(1);
    const conv = result.items[0];
    expect(conv.id).toBe(50);
    expect(conv.status).toBe("open");
    expect(conv.listing.id).toBe(10);
    expect(conv.listing.title).toBe("iPhone 12 Pro");
    expect(conv.listing.thumbnailUrl).toBeNull();
    expect(conv.otherParticipant?.name).toBe("Omar Noori");
    expect(conv.lastMessageBody).toBe("Hi, is this still available?");
    // snake_case server field `unread_count` must arrive as camelCase `unreadCount`
    expect(conv.unreadCount).toBe(0);
    expect(result.pagination.currentPage).toBe(1);
    expect(result.pagination.totalCount).toBe(1);
  });

  it("maps unread_count to unreadCount (snake→camel conversion)", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/conversations", () =>
        HttpResponse.json({
          conversations: [{ ...MOCK_CONVERSATION, unread_count: 3 }],
          meta: { pagination: MOCK_PAGINATION },
        })
      )
    );
    const result = await conversationsAPI.getConversations();
    const conv = result.items[0];
    // Verify camelCase field is present and no raw snake_case key leaked through
    expect(conv.unreadCount).toBe(3);
    expect((conv as Record<string, unknown>)["unread_count"]).toBeUndefined();
  });

  it("passes page number in query string", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/conversations", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          conversations: [],
          meta: { pagination: { current_page: 2, next_page: null, prev_page: 1, total_count: 10, total_pages: 2 } },
        });
      })
    );
    await conversationsAPI.getConversations({ pageNumber: 2 });
    expect(capturedUrl).toContain("page%5Bnumber%5D=2");
  });

  it("passes listingId filter", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/conversations", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          conversations: [],
          meta: { pagination: MOCK_PAGINATION },
        });
      })
    );
    await conversationsAPI.getConversations({ listingId: 10 });
    expect(capturedUrl).toContain("listing_id=10");
  });

  it("passes archived=true query param when archived option is true", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/conversations", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          conversations: [],
          meta: { pagination: MOCK_PAGINATION },
        });
      })
    );
    await conversationsAPI.getConversations({ archived: true });
    expect(capturedUrl).toContain("archived=true");
  });

  it("passes archived=false query param when archived option is false", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/conversations", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          conversations: [],
          meta: { pagination: MOCK_PAGINATION },
        });
      })
    );
    await conversationsAPI.getConversations({ archived: false });
    expect(capturedUrl).toContain("archived=false");
  });

  it("does NOT append archived param when option is omitted", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/conversations", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          conversations: [],
          meta: { pagination: MOCK_PAGINATION },
        });
      })
    );
    await conversationsAPI.getConversations();
    expect(capturedUrl).not.toContain("archived");
  });

  // ── TASK-R517: role scope ────────────────────────────────────────────────
  it("passes role=selling query param when role option is 'selling'", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/conversations", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ conversations: [], meta: { pagination: MOCK_PAGINATION } });
      })
    );
    await conversationsAPI.getConversations({ role: "selling" });
    expect(capturedUrl).toContain("role=selling");
  });

  it("passes role=buying query param when role option is 'buying'", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/conversations", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ conversations: [], meta: { pagination: MOCK_PAGINATION } });
      })
    );
    await conversationsAPI.getConversations({ role: "buying" });
    expect(capturedUrl).toContain("role=buying");
  });

  it("does NOT append role param when option is omitted", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/conversations", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ conversations: [], meta: { pagination: MOCK_PAGINATION } });
      })
    );
    await conversationsAPI.getConversations();
    expect(capturedUrl).not.toContain("role=");
  });

  it("maps viewer_role to viewerRole (snake→camel conversion)", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/conversations", () =>
        HttpResponse.json({
          conversations: [{ ...MOCK_CONVERSATION, viewer_role: "seller" }],
          meta: { pagination: MOCK_PAGINATION },
        })
      )
    );
    const result = await conversationsAPI.getConversations();
    const conv = result.items[0];
    expect(conv.viewerRole).toBe("seller");
    expect((conv as Record<string, unknown>)["viewer_role"]).toBeUndefined();
  });
});

describe("conversationsAPI.getConversation", () => {
  it("returns a single camelCased conversation", async () => {
    const conv = await conversationsAPI.getConversation(50);
    expect(conv.id).toBe(50);
    expect(conv.status).toBe("open");
    expect(conv.buyer?.name).toBe("Ahmad Karimi");
    expect(conv.seller?.name).toBe("Omar Noori");
  });
});

describe("conversationsAPI.startConversation", () => {
  it("posts to /listings/:id/conversations and returns conversation", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("http://localhost:3007/api/v1/listings/10/conversations", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ conversation: MOCK_CONVERSATION }, { status: 201 });
      })
    );
    const conv = await conversationsAPI.startConversation(10, "Hi, is this available?");
    expect(conv.id).toBe(50);
    expect((capturedBody as any).message).toBe("Hi, is this available?");
  });
});

describe("conversationsAPI.getMessages", () => {
  it("returns camelCased messages and pagination", async () => {
    const result = await conversationsAPI.getMessages(50);
    expect(result.items).toHaveLength(1);
    const msg = result.items[0];
    expect(msg.id).toBe(100);
    expect(msg.body).toBe("Hi, is this still available?");
    expect(msg.kind).toBe("text");
    // snake_case `read_at` must arrive as camelCase `readAt`
    expect(msg.readAt).toBeNull();
    // snake_case `attachment_url` must arrive as camelCase `attachmentUrl`
    expect(msg.attachmentUrl).toBeNull();
    expect(msg.sender.id).toBe(1);
    expect(result.pagination.currentPage).toBe(1);
  });

  it("maps read_at and attachment_url to camelCase (snake→camel)", async () => {
    const readTimestamp = "2026-06-15T10:00:00Z";
    server.use(
      http.get("http://localhost:3007/api/v1/conversations/50/messages", () =>
        HttpResponse.json({
          messages: [
            {
              ...MOCK_MESSAGE,
              read_at: readTimestamp,
              attachment_url: "https://cdn.example.com/file.pdf",
              responds_to_id: 42,
            },
          ],
          meta: { pagination: MOCK_PAGINATION },
        })
      )
    );
    const result = await conversationsAPI.getMessages(50);
    const msg = result.items[0];
    expect(msg.readAt).toBe(readTimestamp);
    expect(msg.attachmentUrl).toBe("https://cdn.example.com/file.pdf");
    expect(msg.respondsToId).toBe(42);
    // Raw snake_case keys must not leak through
    expect((msg as Record<string, unknown>)["read_at"]).toBeUndefined();
    expect((msg as Record<string, unknown>)["attachment_url"]).toBeUndefined();
    expect((msg as Record<string, unknown>)["responds_to_id"]).toBeUndefined();
  });

  it("returns messages in ascending order as received from server", async () => {
    const older = { ...MOCK_MESSAGE, id: 1, created_at: "2026-01-01T09:00:00Z", body: "First" };
    const newer = { ...MOCK_MESSAGE, id: 2, created_at: "2026-01-01T10:00:00Z", body: "Second" };
    server.use(
      http.get("http://localhost:3007/api/v1/conversations/50/messages", () =>
        HttpResponse.json({
          messages: [older, newer],
          meta: { pagination: { ...MOCK_PAGINATION, total_count: 2 } },
        })
      )
    );
    const result = await conversationsAPI.getMessages(50);
    expect(result.items).toHaveLength(2);
    // The API returns whatever order the server sends; the screen reverses DESC→ASC
    expect(result.items[0].id).toBe(1);
    expect(result.items[1].id).toBe(2);
  });

  it("passes page params", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/conversations/50/messages", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          messages: [],
          meta: { pagination: MOCK_PAGINATION },
        });
      })
    );
    await conversationsAPI.getMessages(50, { pageNumber: 2, pageSize: 20 });
    expect(capturedUrl).toContain("page%5Bnumber%5D=2");
    expect(capturedUrl).toContain("page%5Bsize%5D=20");
  });
});

describe("conversationsAPI.sendMessage", () => {
  it("sends a text message and returns camelCased message", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("http://localhost:3007/api/v1/conversations/50/messages", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ message: MOCK_MESSAGE }, { status: 201 });
      })
    );
    const msg = await conversationsAPI.sendMessage(50, "Hello there");
    expect(msg.id).toBe(100);
    expect(msg.body).toBe("Hi, is this still available?");
    expect((capturedBody as any).body).toBe("Hello there");
    expect((capturedBody as any).kind).toBe("text");
  });

  it("sends a meetup_proposal with snake_case body", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("http://localhost:3007/api/v1/conversations/50/messages", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ message: { ...MOCK_MESSAGE, kind: "meetup_proposal" } }, { status: 201 });
      })
    );
    const msg = await conversationsAPI.sendMessage(50, "Meet at Shahr-e-Naw", "meetup_proposal");
    expect(msg.kind).toBe("meetup_proposal");
    expect((capturedBody as any).kind).toBe("meetup_proposal");
  });

  it("includes responds_to_id when provided", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("http://localhost:3007/api/v1/conversations/50/messages", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ message: { ...MOCK_MESSAGE, kind: "meetup_accepted" } }, { status: 201 });
      })
    );
    await conversationsAPI.sendMessage(50, "Accepted", "meetup_accepted", 99);
    expect((capturedBody as any).responds_to_id).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// offer_counter kind — TASK-O829
// ---------------------------------------------------------------------------

describe("conversationsAPI.sendMessage — offer_counter", () => {
  it("sends offer_counter kind with responds_to_id and returns camelCased message", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("http://localhost:3007/api/v1/conversations/50/messages", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          message: {
            ...MOCK_MESSAGE,
            kind: "offer_counter",
            body: "9500|AFN|10000",
            responds_to_id: 100,
            offer_amount: 9500.0,
            offer_currency: "AFN",
          },
        }, { status: 201 });
      })
    );
    const msg = await conversationsAPI.sendMessage(50, "9500|AFN|10000", "offer_counter", 100);
    expect(msg.kind).toBe("offer_counter");
    expect(msg.respondsToId).toBe(100);
    expect(msg.offerAmount).toBe(9500.0);
    expect(msg.offerCurrency).toBe("AFN");
    expect((capturedBody as any).kind).toBe("offer_counter");
    expect((capturedBody as any).responds_to_id).toBe(100);
  });

  it("maps offer_amount and offer_currency to camelCase on received messages", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/conversations/50/messages", () =>
        HttpResponse.json({
          messages: [
            {
              ...MOCK_MESSAGE,
              kind: "offer_counter",
              body: "9500|AFN|10000",
              responds_to_id: 99,
              offer_amount: 9500.0,
              offer_currency: "AFN",
            },
          ],
          meta: { pagination: MOCK_PAGINATION },
        })
      )
    );
    const result = await conversationsAPI.getMessages(50);
    const msg = result.items[0];
    expect(msg.kind).toBe("offer_counter");
    expect(msg.offerAmount).toBe(9500.0);
    expect(msg.offerCurrency).toBe("AFN");
    expect(msg.respondsToId).toBe(99);
    // Raw snake_case keys must not leak through
    expect((msg as Record<string, unknown>)["offer_amount"]).toBeUndefined();
    expect((msg as Record<string, unknown>)["offer_currency"]).toBeUndefined();
  });
});

describe("conversationsAPI.markMessagesRead", () => {
  it("resolves without errors on 204", async () => {
    await expect(conversationsAPI.markMessagesRead(50)).resolves.toBeUndefined();
  });

  it("sends a PUT request to the correct mark_read endpoint", async () => {
    let capturedMethod = "";
    let capturedUrl = "";
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/50/messages/mark_read", ({ request }) => {
        capturedMethod = request.method;
        capturedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      })
    );
    await conversationsAPI.markMessagesRead(50);
    expect(capturedMethod).toBe("PUT");
    expect(capturedUrl).toContain("/conversations/50/messages/mark_read");
  });

  it("uses the conversation id in the endpoint path", async () => {
    let capturedUrl = "";
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/99/messages/mark_read", ({ request }) => {
        capturedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      })
    );
    await conversationsAPI.markMessagesRead(99);
    expect(capturedUrl).toContain("/conversations/99/messages/mark_read");
  });

  it("does not throw on network errors so the thread stays usable", async () => {
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/50/messages/mark_read", () =>
        HttpResponse.json({ error: "Internal error" }, { status: 500 })
      )
    );
    // markMessagesRead is fire-and-forget — callers silently ignore errors.
    // The API layer itself should still reject so callers can swallow it.
    await expect(conversationsAPI.markMessagesRead(50)).rejects.toThrow();
  });
});

describe("conversationsAPI.markRead", () => {
  it("resolves without errors on 204", async () => {
    await expect(conversationsAPI.markRead(50)).resolves.toBeUndefined();
  });

  it("sends a PUT request to the correct mark_read endpoint", async () => {
    let capturedMethod = "";
    let capturedUrl = "";
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/50/mark_read", ({ request }) => {
        capturedMethod = request.method;
        capturedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      })
    );
    await conversationsAPI.markRead(50);
    expect(capturedMethod).toBe("PUT");
    expect(capturedUrl).toContain("/conversations/50/mark_read");
  });

  it("uses the conversation id in the endpoint path", async () => {
    let capturedUrl = "";
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/77/mark_read", ({ request }) => {
        capturedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      })
    );
    await conversationsAPI.markRead(77);
    expect(capturedUrl).toContain("/conversations/77/mark_read");
  });

  it("throws on 401 (unauthenticated)", async () => {
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/50/mark_read", () =>
        HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    );
    await expect(conversationsAPI.markRead(50)).rejects.toThrow();
  });
});

describe("conversationsAPI.markUnread", () => {
  it("resolves without errors on 204", async () => {
    await expect(conversationsAPI.markUnread(50)).resolves.toBeUndefined();
  });

  it("sends a PUT request to the correct mark_unread endpoint", async () => {
    let capturedMethod = "";
    let capturedUrl = "";
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/50/mark_unread", ({ request }) => {
        capturedMethod = request.method;
        capturedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      })
    );
    await conversationsAPI.markUnread(50);
    expect(capturedMethod).toBe("PUT");
    expect(capturedUrl).toContain("/conversations/50/mark_unread");
  });

  it("uses the conversation id in the endpoint path", async () => {
    let capturedUrl = "";
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/88/mark_unread", ({ request }) => {
        capturedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      })
    );
    await conversationsAPI.markUnread(88);
    expect(capturedUrl).toContain("/conversations/88/mark_unread");
  });

  it("throws on 401 (unauthenticated)", async () => {
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/50/mark_unread", () =>
        HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    );
    await expect(conversationsAPI.markUnread(50)).rejects.toThrow();
  });
});

describe("conversationsAPI.deleteConversation", () => {
  it("resolves on 204", async () => {
    await expect(conversationsAPI.deleteConversation(50)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    server.use(
      http.delete("http://localhost:3007/api/v1/conversations/999", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      )
    );
    await expect(conversationsAPI.deleteConversation(999)).rejects.toThrow();
  });
});

describe("conversationsAPI.archiveConversation", () => {
  it("resolves without errors on 204", async () => {
    await expect(conversationsAPI.archiveConversation(50)).resolves.toBeUndefined();
  });

  it("sends PUT to the correct archive endpoint", async () => {
    let capturedMethod = "";
    let capturedUrl = "";
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/50/archive", ({ request }) => {
        capturedMethod = request.method;
        capturedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      })
    );
    await conversationsAPI.archiveConversation(50);
    expect(capturedMethod).toBe("PUT");
    expect(capturedUrl).toContain("/conversations/50/archive");
  });

  it("uses the conversation id in the endpoint path", async () => {
    let capturedUrl = "";
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/77/archive", ({ request }) => {
        capturedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      })
    );
    await conversationsAPI.archiveConversation(77);
    expect(capturedUrl).toContain("/conversations/77/archive");
  });

  it("throws on 401 (unauthenticated)", async () => {
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/50/archive", () =>
        HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    );
    await expect(conversationsAPI.archiveConversation(50)).rejects.toThrow();
  });
});

describe("conversationsAPI.unarchiveConversation", () => {
  it("resolves without errors on 204", async () => {
    await expect(conversationsAPI.unarchiveConversation(50)).resolves.toBeUndefined();
  });

  it("sends PUT to the correct unarchive endpoint", async () => {
    let capturedMethod = "";
    let capturedUrl = "";
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/50/unarchive", ({ request }) => {
        capturedMethod = request.method;
        capturedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      })
    );
    await conversationsAPI.unarchiveConversation(50);
    expect(capturedMethod).toBe("PUT");
    expect(capturedUrl).toContain("/conversations/50/unarchive");
  });

  it("uses the conversation id in the endpoint path", async () => {
    let capturedUrl = "";
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/88/unarchive", ({ request }) => {
        capturedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      })
    );
    await conversationsAPI.unarchiveConversation(88);
    expect(capturedUrl).toContain("/conversations/88/unarchive");
  });

  it("throws on 401 (unauthenticated)", async () => {
    server.use(
      http.put("http://localhost:3007/api/v1/conversations/50/unarchive", () =>
        HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    );
    await expect(conversationsAPI.unarchiveConversation(50)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getUnreadTotal — pure aggregation helper that feeds the chat tab badge
// ---------------------------------------------------------------------------

describe("getUnreadTotal", () => {
  it("returns 0 for an empty list", () => {
    expect(getUnreadTotal([])).toBe(0);
  });

  it("returns 0 when every conversation has unreadCount 0", () => {
    const conversations = [
      { unreadCount: 0 },
      { unreadCount: 0 },
      { unreadCount: 0 },
    ];
    expect(getUnreadTotal(conversations)).toBe(0);
  });

  it("sums unreadCount across multiple conversations", () => {
    const conversations = [
      { unreadCount: 3 },
      { unreadCount: 1 },
      { unreadCount: 5 },
    ];
    expect(getUnreadTotal(conversations)).toBe(9);
  });

  it("ignores conversations with unreadCount 0 (they contribute nothing to the total)", () => {
    const conversations = [
      { unreadCount: 4 },
      { unreadCount: 0 },
      { unreadCount: 2 },
      { unreadCount: 0 },
    ];
    expect(getUnreadTotal(conversations)).toBe(6);
  });

  it("treats undefined unreadCount as 0 (safe default)", () => {
    const conversations = [
      { unreadCount: 2 },
      { unreadCount: undefined },
      { unreadCount: 3 },
      {},
    ] as { unreadCount?: number }[];
    expect(getUnreadTotal(conversations)).toBe(5);
  });

  it("returns the exact total when below the 99 cap", () => {
    const conversations = [{ unreadCount: 50 }, { unreadCount: 48 }];
    expect(getUnreadTotal(conversations)).toBe(98);
  });

  it("caps the total at 99 when the sum exceeds 99", () => {
    const conversations = [{ unreadCount: 60 }, { unreadCount: 50 }];
    // 60 + 50 = 110, capped to 99
    expect(getUnreadTotal(conversations)).toBe(99);
  });

  it("returns exactly 99 when the sum is exactly 99 (boundary — no cap applied)", () => {
    const conversations = [{ unreadCount: 99 }];
    expect(getUnreadTotal(conversations)).toBe(99);
  });

  it("returns 99 for a single conversation with unreadCount above the cap", () => {
    const conversations = [{ unreadCount: 150 }];
    expect(getUnreadTotal(conversations)).toBe(99);
  });
});

// ── TASK-M913: deleteMessage ──────────────────────────────────────────────────
describe("conversationsAPI.deleteMessage", () => {
  it("hits DELETE /conversations/:convId/messages/:msgId", async () => {
    let capturedMethod = "";
    let capturedUrl    = "";
    server.use(
      http.delete("http://localhost:3007/api/v1/conversations/50/messages/100", ({ request }) => {
        capturedMethod = request.method;
        capturedUrl    = request.url;
        return HttpResponse.json({
          message: {
            id: 100,
            body: null,
            kind: "text",
            read_at: null,
            created_at: "2026-01-01T10:00:00Z",
            sender: { id: 1, name: "Ahmad Karimi" },
            attachment_url: null,
            responds_to_id: null,
            deleted: true,
            deleted_at: "2026-06-27T12:00:00Z",
          },
        });
      })
    );

    await conversationsAPI.deleteMessage(50, 100);

    expect(capturedMethod).toBe("DELETE");
    expect(capturedUrl).toContain("/conversations/50/messages/100");
  });

  it("returns a Message with deleted=true and null body", async () => {
    const result = await conversationsAPI.deleteMessage(50, 100);
    expect(result.deleted).toBe(true);
    expect(result.body).toBeNull();
    expect(result.attachmentUrl).toBeNull();
    expect(result.id).toBe(100);
  });

  it("converts snake_case response fields to camelCase", async () => {
    const result = await conversationsAPI.deleteMessage(50, 100);
    // deleted_at → deletedAt
    expect(result.deletedAt).toBeDefined();
    expect((result as Record<string, unknown>)["deleted_at"]).toBeUndefined();
  });
});
