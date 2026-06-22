/**
 * conversations-multipart.test.ts
 *
 * Unit tests for the multipart upload functions:
 *   - conversationsAPI.sendFile  (kind:document — regression guard)
 *   - conversationsAPI.sendImage (kind:image_message — new feature TASK-M482)
 *
 * These tests mock global.fetch directly (no MSW) to inspect the FormData
 * payload at the network boundary. They are intentionally isolated from the
 * MSW-based conversations.test.ts to avoid handler conflicts.
 */

import { conversationsAPI } from "../conversations";

// ── Module mocks ──────────────────────────────────────────────────────────────

// secure-storage: return a predictable token set so auth headers are stable
jest.mock("@/utils/secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn().mockImplementation((key: string) => {
      const store: Record<string, string> = {
        "access-token": "tok123",
        client: "cli123",
        uid: "user@example.com",
      };
      return Promise.resolve(store[key] ?? null);
    }),
    setItem: jest.fn().mockResolvedValue(undefined),
    saveAuthHeaders: jest.fn().mockResolvedValue(undefined),
    clearAuthHeaders: jest.fn().mockResolvedValue(undefined),
  },
}));

// http module is NOT used by sendFile/sendImage — they call global.fetch.
// Mock it so imports don't fail due to Expo Constants or other env deps.
jest.mock("@/api/http", () => ({
  http: {
    get:    jest.fn(),
    post:   jest.fn(),
    put:    jest.fn(),
    delete: jest.fn(),
  },
  BASE_URL: "http://localhost:3007/api/v1",
  blockedNoticeFromResponse: jest.fn().mockReturnValue(null),
}));

// auth.store is referenced by http.ts interceptors — stub it
jest.mock("@/stores/auth.store", () => ({
  useAuthStore: { getState: () => ({ clearUser: jest.fn(), setBlockedNotice: jest.fn() }) },
}));

// ── Shared fixture ────────────────────────────────────────────────────────────

const MOCK_MESSAGE_BASE = {
  id: 100,
  body: "test-file.jpg",
  read_at: null,
  created_at: "2026-01-01T10:00:00Z",
  sender: { id: 1, name: "Ahmad Karimi" },
  attachment_url: null,
  responds_to_id: null,
};

// ── sendFile ──────────────────────────────────────────────────────────────────

describe("conversationsAPI.sendFile", () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          ...MOCK_MESSAGE_BASE,
          kind: "document",
          attachment_url: "https://cdn.example.com/doc.pdf",
        },
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).fetch;
  });

  it("sends kind:document in the FormData body", async () => {
    await conversationsAPI.sendFile(50, "file:///tmp/doc.pdf", "doc.pdf", "application/pdf");
    const body: FormData = (global as any).fetch.mock.calls[0][1].body;
    expect((body as any).get("kind")).toBe("document");
  });

  it("sets body to the filename", async () => {
    await conversationsAPI.sendFile(50, "file:///tmp/doc.pdf", "doc.pdf", "application/pdf");
    const body: FormData = (global as any).fetch.mock.calls[0][1].body;
    expect((body as any).get("body")).toBe("doc.pdf");
  });

  it("returns a camelCased message with kind:document and attachmentUrl", async () => {
    const msg = await conversationsAPI.sendFile(50, "file:///tmp/doc.pdf", "doc.pdf", "application/pdf");
    expect(msg.kind).toBe("document");
    expect(msg.attachmentUrl).toBe("https://cdn.example.com/doc.pdf");
    expect((msg as any).attachment_url).toBeUndefined();
  });

  it("throws 'Upload failed' when the server returns a non-ok response", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false });
    await expect(
      conversationsAPI.sendFile(50, "file:///tmp/doc.pdf", "doc.pdf", "application/pdf")
    ).rejects.toThrow("Upload failed");
  });
});

// ── sendImage ─────────────────────────────────────────────────────────────────

describe("conversationsAPI.sendImage", () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          ...MOCK_MESSAGE_BASE,
          kind: "image_message",
          attachment_url: "https://cdn.example.com/photo.jpg",
        },
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).fetch;
  });

  it("sends kind:image_message in the FormData body", async () => {
    await conversationsAPI.sendImage(50, "file:///tmp/photo.jpg", "photo.jpg", "image/jpeg");
    const body: FormData = (global as any).fetch.mock.calls[0][1].body;
    expect((body as any).get("kind")).toBe("image_message");
  });

  it("includes an attachment part in the FormData (RN-style object appended)", async () => {
    // In React Native, FormData.append("attachment", { uri, name, type }) appends
    // a plain object — the native layer unwraps it. In JSDOM (test env) the object
    // is coerced to a string by FormData.get(). We verify the append was called at
    // all (attachment key is present) without asserting the serialised string value,
    // which is an implementation detail of JSDOM, not the mobile runtime.
    await conversationsAPI.sendImage(50, "file:///tmp/photo.jpg", "photo.jpg", "image/jpeg");
    const body: FormData = (global as any).fetch.mock.calls[0][1].body;
    // The "attachment" key must exist in the FormData
    expect((body as any).has("attachment")).toBe(true);
  });

  it("uses the correct conversation messages endpoint", async () => {
    await conversationsAPI.sendImage(77, "file:///tmp/photo.jpg", "photo.jpg", "image/jpeg");
    const url: string = (global as any).fetch.mock.calls[0][0];
    expect(url).toContain("/conversations/77/messages");
  });

  it("returns a camelCased message with kind:image_message and attachmentUrl", async () => {
    const msg = await conversationsAPI.sendImage(50, "file:///tmp/photo.jpg", "photo.jpg", "image/jpeg");
    expect(msg.kind).toBe("image_message");
    expect(msg.attachmentUrl).toBe("https://cdn.example.com/photo.jpg");
    // Raw snake_case field must NOT leak through
    expect((msg as any).attachment_url).toBeUndefined();
  });

  it("sends DeviseTokenAuth headers in the request", async () => {
    await conversationsAPI.sendImage(50, "file:///tmp/photo.jpg", "photo.jpg", "image/jpeg");
    const headers = (global as any).fetch.mock.calls[0][1].headers;
    expect(headers["token-type"]).toBe("Bearer");
    expect(headers["access-token"]).toBe("tok123");
    expect(headers["client"]).toBe("cli123");
    expect(headers["uid"]).toBe("user@example.com");
  });

  it("throws 'Upload failed' when the server returns a non-ok response", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false });
    await expect(
      conversationsAPI.sendImage(50, "file:///tmp/photo.jpg", "photo.jpg", "image/jpeg")
    ).rejects.toThrow("Upload failed");
  });

  it("does NOT send kind:document (regression — sendFile must not bleed into sendImage)", async () => {
    await conversationsAPI.sendImage(50, "file:///tmp/photo.jpg", "photo.jpg", "image/jpeg");
    const body: FormData = (global as any).fetch.mock.calls[0][1].body;
    expect((body as any).get("kind")).not.toBe("document");
  });
});
