import { useAuthIntentStore, AUTH_INTENT } from "@/stores/authIntent.store";

describe("authIntent store", () => {
  beforeEach(() => useAuthIntentStore.getState().clear());

  it("returns the intent for a matching route", () => {
    useAuthIntentStore.getState().remember({
      returnTo: "/(main)/listing/42",
      key: AUTH_INTENT.save,
    });
    expect(useAuthIntentStore.getState().consume("/(main)/listing/42")).toBe(
      AUTH_INTENT.save
    );
  });

  it("does not hand an intent to a different route", () => {
    // A guest tapped save on listing 42; arriving at listing 7 must not save 7.
    useAuthIntentStore.getState().remember({
      returnTo: "/(main)/listing/42",
      key: AUTH_INTENT.save,
    });
    expect(useAuthIntentStore.getState().consume("/(main)/listing/7")).toBeNull();
    // and it is still waiting for the route it belongs to
    expect(useAuthIntentStore.getState().consume("/(main)/listing/42")).toBe(
      AUTH_INTENT.save
    );
  });

  it("is single-shot — a second read gets nothing", () => {
    // save is a TOGGLE: replaying it twice would undo the save. consume() clears
    // as it reads, so a remount or an extra render cannot fire it again.
    useAuthIntentStore.getState().remember({
      returnTo: "/(main)/listing/42",
      key: AUTH_INTENT.save,
    });
    expect(useAuthIntentStore.getState().consume("/(main)/listing/42")).toBe(
      AUTH_INTENT.save
    );
    expect(useAuthIntentStore.getState().consume("/(main)/listing/42")).toBeNull();
  });

  it("returns null when nothing is pending", () => {
    expect(useAuthIntentStore.getState().consume("/(main)/listing/42")).toBeNull();
  });

  it("clear() drops a pending intent so it cannot fire for the next user", () => {
    useAuthIntentStore.getState().remember({
      returnTo: "/(main)/listing/42",
      key: AUTH_INTENT.offer,
    });
    useAuthIntentStore.getState().clear();
    expect(useAuthIntentStore.getState().consume("/(main)/listing/42")).toBeNull();
  });

  it("keeps only the most recent intent", () => {
    useAuthIntentStore.getState().remember({ returnTo: "/a", key: AUTH_INTENT.save });
    useAuthIntentStore.getState().remember({ returnTo: "/b", key: AUTH_INTENT.offer });
    expect(useAuthIntentStore.getState().consume("/a")).toBeNull();
    expect(useAuthIntentStore.getState().consume("/b")).toBe(AUTH_INTENT.offer);
  });
});
