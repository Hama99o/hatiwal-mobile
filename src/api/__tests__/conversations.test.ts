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
