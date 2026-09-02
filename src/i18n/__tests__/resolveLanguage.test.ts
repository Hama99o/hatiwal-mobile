import { describe, it, expect } from "@jest/globals";
import { resolveLanguageFromUser } from "../resolveLanguage";

describe("resolveLanguageFromUser", () => {
  it("keeps the local choice and corrects the server when they disagree", () => {
    // The exact shape of the owner's bug: the user picked ps, the restart killed
    // the PATCH, so the server still says en. The user must stay in ps.
    expect(resolveLanguageFromUser("ps", "en")).toEqual({ apply: null, pushToBackend: "ps" });
  });

  it("does nothing when local and server already agree", () => {
    expect(resolveLanguageFromUser("fa", "fa")).toEqual({ apply: null, pushToBackend: null });
  });

  it("seeds from the server when there is no local choice (fresh install)", () => {
    expect(resolveLanguageFromUser(null, "ps")).toEqual({ apply: "ps", pushToBackend: null });
  });

  it("keeps the local choice even when the server has none", () => {
    expect(resolveLanguageFromUser("ps", null)).toEqual({ apply: null, pushToBackend: null });
  });

  it("does nothing when neither side has a preference", () => {
    expect(resolveLanguageFromUser(null, null)).toEqual({ apply: null, pushToBackend: null });
  });

  it("treats an empty string as no choice, not as a language", () => {
    expect(resolveLanguageFromUser("", "ps")).toEqual({ apply: "ps", pushToBackend: null });
  });

  it("never asks to apply and to push at the same time", () => {
    for (const stored of ["en", "ps", "fa", null, undefined] as const) {
      for (const fromUser of ["en", "ps", "fa", null, undefined] as const) {
        const r = resolveLanguageFromUser(stored, fromUser);
        expect(r.apply === null || r.pushToBackend === null).toBe(true);
      }
    }
  });
});
