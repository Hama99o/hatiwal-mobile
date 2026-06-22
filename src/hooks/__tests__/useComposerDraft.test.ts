/**
 * Unit tests for useComposerDraft
 *
 * AsyncStorage is auto-mocked by the global setup in src/__tests__/setup.ts.
 * We use renderHook from @testing-library/react-hooks via @testing-library/react-native.
 *
 * Each test uses a unique conversationId (no shared state between tests)
 * so the debounce timer and storage are isolated.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderHook, act } from "@testing-library/react-native";
import { useComposerDraft, composerDraftKey } from "../useComposerDraft";

// Use fake timers so we can fast-forward the 400ms debounce without real waiting.
jest.useFakeTimers();

// Reset AsyncStorage mock calls between tests so assertions are clean.
beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.clearAllTimers();
});

// Tests --------------------------------------------------------------------

describe("composerDraftKey", () => {
  it("generates a per-conversation key with the expected prefix", () => {
    expect(composerDraftKey(42)).toBe("hatiwal:chat-draft:42");
    expect(composerDraftKey(1)).toBe("hatiwal:chat-draft:1");
  });
});

describe("useComposerDraft — initial state", () => {
  it("starts with empty draft when no stored value", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useComposerDraft(101));

    // Before storage resolves, draft should be ""
    expect(result.current.draft).toBe("");

    // Allow the async effect to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.draft).toBe("");
  });

  it("hydrates draft from AsyncStorage when a stored value exists", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("Hello seller");

    const { result } = renderHook(() => useComposerDraft(102));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.draft).toBe("Hello seller");
  });

  it("reads the correct per-conversation key from AsyncStorage", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    renderHook(() => useComposerDraft(103));

    await act(async () => {
      await Promise.resolve();
    });

    expect(AsyncStorage.getItem).toHaveBeenCalledWith("hatiwal:chat-draft:103");
  });

  it("is a no-op when conversationId is null", async () => {
    const { result } = renderHook(() => useComposerDraft(null));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.draft).toBe("");
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });
});

describe("useComposerDraft — setDraft persists text", () => {
  it("persists text to storage after debounce fires", async () => {
    const { result } = renderHook(() => useComposerDraft(201));

    await act(async () => { await Promise.resolve(); });

    act(() => {
      result.current.setDraft("Is this still available?");
    });

    // Before debounce fires, setItem has NOT been called yet
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    // Advance timers past the 400ms debounce
    await act(async () => {
      jest.advanceTimersByTime(401);
      await Promise.resolve();
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "hatiwal:chat-draft:201",
      "Is this still available?"
    );
  });

  it("updates the in-memory draft immediately (not after debounce)", async () => {
    const { result } = renderHook(() => useComposerDraft(202));

    await act(async () => { await Promise.resolve(); });

    act(() => {
      result.current.setDraft("typing now");
    });

    // State is updated synchronously by React
    expect(result.current.draft).toBe("typing now");
  });

  it("removes the key from storage when text is set to empty string", async () => {
    const { result } = renderHook(() => useComposerDraft(203));

    await act(async () => { await Promise.resolve(); });

    act(() => {
      result.current.setDraft("some text");
    });
    await act(async () => {
      jest.advanceTimersByTime(401);
      await Promise.resolve();
    });

    // Now clear it
    act(() => {
      result.current.setDraft("");
    });
    await act(async () => {
      jest.advanceTimersByTime(401);
      await Promise.resolve();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("hatiwal:chat-draft:203");
  });

  it("debounces rapid changes — only writes the last value", async () => {
    const { result } = renderHook(() => useComposerDraft(204));

    await act(async () => { await Promise.resolve(); });

    act(() => {
      result.current.setDraft("H");
      result.current.setDraft("He");
      result.current.setDraft("Hel");
      result.current.setDraft("Hell");
      result.current.setDraft("Hello");
    });

    await act(async () => {
      jest.advanceTimersByTime(401);
      await Promise.resolve();
    });

    // Only one setItem call with the final value
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "hatiwal:chat-draft:204",
      "Hello"
    );
  });

  it("does not write to storage when conversationId is null", async () => {
    const { result } = renderHook(() => useComposerDraft(null));

    await act(async () => { await Promise.resolve(); });

    act(() => {
      result.current.setDraft("some text");
    });

    await act(async () => {
      jest.advanceTimersByTime(401);
      await Promise.resolve();
    });

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

describe("useComposerDraft — clearDraft removes the key", () => {
  it("removes the storage key immediately (synchronously queued)", async () => {
    const { result } = renderHook(() => useComposerDraft(301));

    await act(async () => { await Promise.resolve(); });

    // Write something first
    act(() => {
      result.current.setDraft("draft text");
    });
    await act(async () => {
      jest.advanceTimersByTime(401);
      await Promise.resolve();
    });
    expect(AsyncStorage.setItem).toHaveBeenCalled();

    // Now clear
    act(() => {
      result.current.clearDraft();
    });
    await act(async () => { await Promise.resolve(); });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("hatiwal:chat-draft:301");
  });

  it("cancels any pending debounced write before clearing", async () => {
    const { result } = renderHook(() => useComposerDraft(302));

    await act(async () => { await Promise.resolve(); });

    // Start typing (debounce not yet fired)
    act(() => {
      result.current.setDraft("partial text");
    });

    // Immediately clear before the debounce fires
    act(() => {
      result.current.clearDraft();
    });

    // Advance timers — the debounced setItem should NOT fire because clearDraft cancelled it
    await act(async () => {
      jest.advanceTimersByTime(401);
      await Promise.resolve();
    });

    // setItem was never called (debounce was cancelled)
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    // removeItem was called by clearDraft
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("hatiwal:chat-draft:302");
  });

  it("is a no-op when conversationId is null", async () => {
    const { result } = renderHook(() => useComposerDraft(null));

    await act(async () => { await Promise.resolve(); });

    act(() => {
      result.current.clearDraft();
    });
    await act(async () => { await Promise.resolve(); });

    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });
});

describe("useComposerDraft — storage failure does not break the hook", () => {
  it("handles getItem failure gracefully — draft stays empty", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("storage unavailable"));

    const { result } = renderHook(() => useComposerDraft(401));

    await act(async () => { await Promise.resolve(); });

    // Should not throw; draft remains ""
    expect(result.current.draft).toBe("");
  });

  it("handles setItem failure gracefully — UI state still updates", async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error("disk full"));

    const { result } = renderHook(() => useComposerDraft(402));

    await act(async () => { await Promise.resolve(); });

    let threw = false;
    try {
      act(() => {
        result.current.setDraft("some text");
      });
      await act(async () => {
        jest.advanceTimersByTime(401);
        await Promise.resolve();
      });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    // In-memory draft was still updated
    expect(result.current.draft).toBe("some text");
  });

  it("handles removeItem failure gracefully — no throw", async () => {
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error("storage error"));

    const { result } = renderHook(() => useComposerDraft(403));

    await act(async () => { await Promise.resolve(); });

    let threw = false;
    try {
      act(() => {
        result.current.clearDraft();
      });
      await act(async () => { await Promise.resolve(); });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
  });
});

describe("useComposerDraft — independent drafts per conversation", () => {
  it("two different conversation ids use independent storage keys", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "hatiwal:chat-draft:501") return Promise.resolve("draft for 501");
      if (key === "hatiwal:chat-draft:502") return Promise.resolve("draft for 502");
      return Promise.resolve(null);
    });

    const { result: result501 } = renderHook(() => useComposerDraft(501));
    const { result: result502 } = renderHook(() => useComposerDraft(502));

    await act(async () => { await Promise.resolve(); });

    expect(result501.current.draft).toBe("draft for 501");
    expect(result502.current.draft).toBe("draft for 502");
  });

  it("clearing one conversation's draft does not affect the other", async () => {
    const { result: result601 } = renderHook(() => useComposerDraft(601));
    const { result: result602 } = renderHook(() => useComposerDraft(602));

    await act(async () => { await Promise.resolve(); });

    act(() => {
      result601.current.clearDraft();
    });
    await act(async () => { await Promise.resolve(); });

    // Only 601's key was removed
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("hatiwal:chat-draft:601");
    expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith("hatiwal:chat-draft:602");
  });

  it("typing in one conversation does not write to another conversation's key", async () => {
    const { result: result701 } = renderHook(() => useComposerDraft(701));

    await act(async () => { await Promise.resolve(); });

    act(() => {
      result701.current.setDraft("message for 701");
    });

    await act(async () => {
      jest.advanceTimersByTime(401);
      await Promise.resolve();
    });

    // Only 701's key was written
    const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
    calls.forEach(([key]: [string]) => {
      expect(key).toBe("hatiwal:chat-draft:701");
    });
  });
});

describe("useComposerDraft — does not overwrite user-typed text on hydration", () => {
  it("keeps existing in-memory text when storage hydrates with a value", async () => {
    // Simulate storage returning a value asynchronously AFTER the user has
    // already started typing (extremely fast typist).
    let resolveStorageGet!: (v: string | null) => void;
    (AsyncStorage.getItem as jest.Mock).mockReturnValue(
      new Promise<string | null>((res) => { resolveStorageGet = res; })
    );

    const { result } = renderHook(() => useComposerDraft(801));

    // User types before storage resolves
    act(() => {
      result.current.setDraft("user already typed this");
    });
    expect(result.current.draft).toBe("user already typed this");

    // Now storage resolves with a different value
    await act(async () => {
      resolveStorageGet("old stored draft");
      await Promise.resolve();
    });

    // The hook must NOT overwrite the user's typed text with the stored value
    expect(result.current.draft).toBe("user already typed this");
  });
});
