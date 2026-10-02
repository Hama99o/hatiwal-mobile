import { runAppTransition, useAppTransitionStore } from "../appTransition.store";

describe("runAppTransition", () => {
  beforeEach(() => useAppTransitionStore.setState({ message: null }));

  it("shows the message while the work runs and hides it after", async () => {
    let seenDuringWork: string | null = null;
    const ok = await runAppTransition("Changing language…", async () => {
      seenDuringWork = useAppTransitionStore.getState().message;
    });
    expect(ok).toBe(true);
    expect(seenDuringWork).toBe("Changing language…");
    expect(useAppTransitionStore.getState().message).toBeNull();
  });

  it("shows the overlay synchronously, before any work starts", () => {
    void runAppTransition("Applying theme…", () => new Promise(() => {}));
    expect(useAppTransitionStore.getState().message).toBe("Applying theme…");
  });

  it("ignores a second change while one is running (no double tap)", async () => {
    let release!: () => void;
    const first = runAppTransition("one", () => new Promise<void>((r) => (release = r)));
    const second = jest.fn();
    await expect(runAppTransition("two", second)).resolves.toBe(false);
    expect(second).not.toHaveBeenCalled();
    expect(useAppTransitionStore.getState().message).toBe("one");
    await new Promise((r) => setTimeout(r, 60));
    release();
    await first;
    expect(useAppTransitionStore.getState().message).toBeNull();
  });

  it("hides the overlay even if the work throws", async () => {
    await expect(
      runAppTransition("x", () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
    expect(useAppTransitionStore.getState().message).toBeNull();
  });
});
