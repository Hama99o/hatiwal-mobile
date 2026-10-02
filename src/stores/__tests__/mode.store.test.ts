import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "@/stores/auth.store";
import { useModeStore } from "@/stores/mode.store";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("@/api/auth", () => ({
  authAPI: { updateMe: jest.fn(() => Promise.resolve()) },
}));

const user = { id: 603 } as never;

describe("mode store follows the session", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    useModeStore.setState({ mode: "buyer" });
  });

  it("a session ended WITHOUT the logout button (401 / blocked) drops seller mode", async () => {
    useAuthStore.getState().setUser(user);
    useModeStore.setState({ mode: "seller" });

    // What api/http.ts and auth.bootstrap.ts do on a dead token.
    useAuthStore.getState().clearUser();
    await Promise.resolve();

    expect(useModeStore.getState().mode).toBe("buyer");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("hatiwal-mode");
  });

  it("signing IN does not touch the mode (Splash hydrates it from the user)", () => {
    useModeStore.setState({ mode: "seller" });
    useAuthStore.getState().setUser(user);

    expect(useModeStore.getState().mode).toBe("seller");
  });

  it("an update while still signed in does not reset it", () => {
    useAuthStore.getState().setUser(user);
    useModeStore.setState({ mode: "seller" });
    useAuthStore.getState().setUser({ id: 603, name: "Omar" } as never);

    expect(useModeStore.getState().mode).toBe("seller");
  });
});
