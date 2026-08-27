/**
 * The chat tab badge's data source.
 *
 * The bug this guards: the badge used to read chat.store's `unreadMessageTotal`, which
 * Conversations.tsx syncs from the inbox — so it was only ever populated AFTER the user
 * opened Chats, and the tab showed nothing while the Profile screen correctly showed
 * "Messages 7". A badge that only appears once you have found the messages is not a
 * badge. These tests pin the count to ["me"], which is fetched wherever the tab bar is.
 *
 * Each test unmounts explicitly: the hook sets a refetchInterval, and a live timer
 * outliving its test is what makes jest report "did not exit one second after the test
 * run has completed".
 */
import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";

const mockMe = jest.fn();
jest.mock("@/api/auth", () => ({
  authAPI: {
    get me() {
      return mockMe;
    },
  },
}));

// `mock` prefix required: jest forbids a mock factory referencing any other
// out-of-scope variable.
let mockAuthenticated = true;
jest.mock("@/stores/auth.store", () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: mockAuthenticated }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockAuthenticated = true;
  mockMe.mockReset();
});

describe("useUnreadMessageCount", () => {
  it("reports the count carried on the me payload", async () => {
    mockMe.mockResolvedValue({ id: 1, unreadMessageCount: 7 });
    const { result, unmount } = renderHook(() => useUnreadMessageCount(), { wrapper });
    await waitFor(() => expect(result.current).toBe(7));
    unmount();   // stops the hook's refetchInterval with the test
  });

  it("reports 0 while the request is in flight, then the real count", async () => {
    // The badge renders from this number on every screen, so a transient `undefined`
    // would read as NaN in the tab bar. Deferred rather than a never-resolving promise:
    // leaving one pending keeps jest alive after the assertions have passed.
    let settle!: (value: unknown) => void;
    mockMe.mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      })
    );

    const { result, unmount } = renderHook(() => useUnreadMessageCount(), { wrapper });
    expect(result.current).toBe(0);

    settle({ id: 1, unreadMessageCount: 2 });
    await waitFor(() => expect(result.current).toBe(2));
    unmount();   // stops the hook's refetchInterval with the test
  });

  it("reports 0 when the field is absent from the payload", async () => {
    // unreadMessageCount is optional on the User type; an older API build omits it.
    mockMe.mockResolvedValue({ id: 1 });
    const { result, unmount } = renderHook(() => useUnreadMessageCount(), { wrapper });
    await waitFor(() => expect(mockMe).toHaveBeenCalled());
    expect(result.current).toBe(0);
    unmount();   // stops the hook's refetchInterval with the test
  });

  it("does not fetch at all for a guest", () => {
    // A logged-out guest has no chat tab, and asking /me would 401 on every mount.
    mockAuthenticated = false;
    const { result, unmount } = renderHook(() => useUnreadMessageCount(), { wrapper });
    expect(mockMe).not.toHaveBeenCalled();
    expect(result.current).toBe(0);
    unmount();   // stops the hook's refetchInterval with the test
  });

  it("reports 0 when the request fails, rather than throwing", async () => {
    // A badge must never be the thing that takes a screen down.
    mockMe.mockRejectedValue(new Error("network"));
    const { result, unmount } = renderHook(() => useUnreadMessageCount(), { wrapper });
    await waitFor(() => expect(mockMe).toHaveBeenCalled());
    expect(result.current).toBe(0);
    unmount();   // stops the hook's refetchInterval with the test
  });
});
