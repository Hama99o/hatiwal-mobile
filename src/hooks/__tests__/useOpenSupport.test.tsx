import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastError = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { error: (...a: unknown[]) => mockToastError(...a), success: jest.fn() } }));

const mockOpen = jest.fn();
jest.mock("@/api/conversations", () => ({
  conversationsAPI: { openSupportConversation: () => mockOpen() },
}));

import { useOpenSupport } from "../useOpenSupport";

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = jest.spyOn(qc, "invalidateQueries");
  const hook = renderHook(() => useOpenSupport(), {
    wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
  });
  return { ...hook, invalidate };
}

beforeEach(() => jest.clearAllMocks());

describe("useOpenSupport", () => {
  it("opens the thread the server returns and refreshes the inbox", async () => {
    mockOpen.mockResolvedValue({ id: 2995, kind: "support" });
    const { result, invalidate } = setup();

    act(() => result.current.openSupport());

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/(main)/conversation/2995"));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["conversations"] });
  });

  it("on failure shows a toast WITH a working Retry, never a dead tap", async () => {
    mockOpen.mockRejectedValueOnce(new Error("Network Error")).mockResolvedValueOnce({ id: 7 });
    const { result } = setup();

    act(() => result.current.openSupport());
    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1));
    const [message, options] = mockToastError.mock.calls[0];
    expect(message).toBe("chat.support.openError");
    expect(options.action.label).toBe("common.retry");
    expect(mockPush).not.toHaveBeenCalled();

    act(() => options.action.onClick());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/(main)/conversation/7"));
  });
});
