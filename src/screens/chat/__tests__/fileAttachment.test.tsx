/**
 * fileAttachment — unit tests for TASK-K487's file-upload optimistic bubble.
 *
 * Conversation.tsx's `handleAttachment` previously awaited
 * `conversationsAPI.sendFile(...)` with NO optimistic bubble and no in-flight
 * state — picking a large file looked like the tap did nothing until the
 * bubble finally appeared. This card gave it the exact same contract
 * `handlePhotoAttachment` already had: optimistic insert (negative temp id,
 * `kind: "document"`, `body: file.name`) → replace with the server message
 * on success, or remove it + `toast.error("chat.thread.sendFailed")` on
 * failure — with an `isSendingFile` flag disabling re-entry while in flight.
 *
 * ConversationScreen itself is too deeply coupled (ActionCable, composer
 * draft persistence, FlatList, gesture-handler/reanimated) to mount in JSDOM
 * — see offerInThread.test.tsx / reportParticipant.test.tsx for the same
 * rationale. `FileAttachmentAffordance` below mirrors handleAttachment's
 * logic starting from an already-picked file (the DocumentPicker step
 * itself is untested elsewhere in this codebase and out of scope here —
 * this suite is about the upload contract, not the native picker).
 *
 * Covers:
 *  1. Optimistic bubble appears immediately, before the upload resolves.
 *  2. conversationsAPI.sendFile is called with the picked file's uri/name/mimeType.
 *  3. Success reconciles the optimistic id with the real server message.
 *  4. Failure rolls back the bubble and shows the send-failed toast.
 *  5. An in-flight indicator is shown while pending and cleared on both
 *     success and failure.
 *  6. Re-entry is blocked while an upload is already in flight.
 */

import React, { useCallback, useState } from "react";
import { View, Pressable, Text as RNText } from "react-native";
import { render, screen, fireEvent, act } from "@testing-library/react-native";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("sonner-native", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/api/conversations", () => ({
  conversationsAPI: {
    sendFile: jest.fn(),
  },
}));

// Import after mocks
import { toast } from "sonner-native";
import { conversationsAPI, type Message } from "@/api/conversations";

function makeSentMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 999,
    body: "invoice.pdf",
    kind: "document",
    readAt: null,
    createdAt: "2026-01-01T10:00:00Z",
    sender: { id: 1, name: "Buyer" },
    ...overrides,
  };
}

const DEFAULT_FILE = { uri: "file:///tmp/invoice.pdf", name: "invoice.pdf", mimeType: "application/pdf" };

/**
 * Mirrors Conversation.tsx's handleAttachment from right after
 * `DocumentPicker.getDocumentAsync()` resolves — the optimistic-bubble →
 * replace-on-success / rollback + toast contract this card added (TASK-K487).
 */
function FileAttachmentAffordance({
  conversationId = 1,
  file = DEFAULT_FILE,
}: {
  conversationId?: number;
  file?: { uri: string; name: string; mimeType: string };
}) {
  const [messages, setMessages] = useState<Pick<Message, "id" | "body" | "kind">[]>([]);
  const [isSendingFile, setIsSendingFile] = useState(false);

  const handleAttachment = useCallback(async () => {
    if (isSendingFile) return;
    const fileName = file.name ?? "file";
    const mimeType = file.mimeType ?? "application/octet-stream";

    setIsSendingFile(true);

    // Optimistic insert — mirrors handlePhotoAttachment's pattern exactly.
    const optimistic = { id: -1, body: fileName, kind: "document" as const };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const sent = await conversationsAPI.sendFile(conversationId, file.uri, fileName, mimeType);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? sent : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      toast.error("chat.thread.sendFailed");
    } finally {
      setIsSendingFile(false);
    }
  }, [conversationId, file, isSendingFile]);

  return (
    <View>
      <Pressable testID="pick-file-button" disabled={isSendingFile} onPress={handleAttachment}>
        <RNText>Attach file</RNText>
      </Pressable>
      {isSendingFile && <RNText testID="file-sending-indicator">sending</RNText>}
      {messages.map((m) => (
        <RNText key={m.id} testID={`thread-message-${m.id}`}>
          {m.kind}:{m.body}
        </RNText>
      ))}
    </View>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 1 & 3. Optimistic bubble + reconciliation ─────────────────────────────────

describe("handleAttachment — optimistic bubble (TASK-K487)", () => {
  it("appends an optimistic document bubble immediately, before the upload resolves", async () => {
    let resolveSend!: (m: Message) => void;
    (conversationsAPI.sendFile as jest.Mock).mockReturnValue(
      new Promise<Message>((resolve) => {
        resolveSend = resolve;
      })
    );

    render(<FileAttachmentAffordance />);

    act(() => {
      fireEvent.press(screen.getByTestId("pick-file-button"));
    });

    // Optimistic bubble is visible immediately — before the promise resolves.
    expect(screen.getByTestId("thread-message--1")).toBeTruthy();
    expect(screen.getByText("document:invoice.pdf")).toBeTruthy();

    await act(async () => {
      resolveSend(makeSentMessage({ id: 999 }));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    // Reconciled with the real server id — the optimistic negative id is gone.
    expect(screen.queryByTestId("thread-message--1")).toBeNull();
    expect(screen.getByTestId("thread-message-999")).toBeTruthy();
  });

  it("calls conversationsAPI.sendFile with the picked file's conversationId/uri/name/mimeType", async () => {
    (conversationsAPI.sendFile as jest.Mock).mockResolvedValue(makeSentMessage());
    render(<FileAttachmentAffordance conversationId={42} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId("pick-file-button"));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(conversationsAPI.sendFile).toHaveBeenCalledWith(
      42,
      "file:///tmp/invoice.pdf",
      "invoice.pdf",
      "application/pdf"
    );
  });
});

// ── 4. Rollback + toast on failure ────────────────────────────────────────────

describe("handleAttachment — rollback on failure (TASK-K487)", () => {
  it("rolls back the optimistic bubble and shows the send-failed toast", async () => {
    (conversationsAPI.sendFile as jest.Mock).mockRejectedValue(new Error("network error"));
    render(<FileAttachmentAffordance />);

    await act(async () => {
      fireEvent.press(screen.getByTestId("pick-file-button"));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    // Rolled back — no leftover bubble of any kind.
    expect(screen.queryByText("document:invoice.pdf")).toBeNull();
    expect(screen.queryByTestId("thread-message--1")).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("chat.thread.sendFailed");
  });
});

// ── 5. In-flight indicator ────────────────────────────────────────────────────

describe("handleAttachment — in-flight state (TASK-K487)", () => {
  it("shows an in-flight indicator while pending, cleared on success", async () => {
    let resolveSend!: (m: Message) => void;
    (conversationsAPI.sendFile as jest.Mock).mockReturnValue(
      new Promise<Message>((resolve) => {
        resolveSend = resolve;
      })
    );
    render(<FileAttachmentAffordance />);

    act(() => {
      fireEvent.press(screen.getByTestId("pick-file-button"));
    });
    expect(screen.getByTestId("file-sending-indicator")).toBeTruthy();

    await act(async () => {
      resolveSend(makeSentMessage());
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.queryByTestId("file-sending-indicator")).toBeNull();
  });

  it("shows an in-flight indicator while pending, cleared on failure too", async () => {
    let rejectSend!: (e: Error) => void;
    (conversationsAPI.sendFile as jest.Mock).mockReturnValue(
      new Promise<Message>((_resolve, reject) => {
        rejectSend = reject;
      })
    );
    render(<FileAttachmentAffordance />);

    act(() => {
      fireEvent.press(screen.getByTestId("pick-file-button"));
    });
    expect(screen.getByTestId("file-sending-indicator")).toBeTruthy();

    await act(async () => {
      rejectSend(new Error("network error"));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.queryByTestId("file-sending-indicator")).toBeNull();
  });
});

// ── 6. Re-entry guard ─────────────────────────────────────────────────────────

describe("handleAttachment — disabled while already sending (TASK-K487)", () => {
  it("does not call sendFile a second time while an upload is already in flight", async () => {
    let resolveSend!: (m: Message) => void;
    (conversationsAPI.sendFile as jest.Mock).mockReturnValue(
      new Promise<Message>((resolve) => {
        resolveSend = resolve;
      })
    );
    render(<FileAttachmentAffordance />);

    act(() => {
      fireEvent.press(screen.getByTestId("pick-file-button"));
    });
    // Second tap while pending — the Pressable is disabled via isSendingFile.
    fireEvent.press(screen.getByTestId("pick-file-button"));

    await act(async () => {
      resolveSend(makeSentMessage());
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(conversationsAPI.sendFile).toHaveBeenCalledTimes(1);
  });
});
