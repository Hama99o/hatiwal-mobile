/**
 * apiError — prefer what the server said.
 *
 * The bug this guards against: the backend already returns a usable sentence
 * ("Price must be less than or equal to 9999999999.99"), and the app used to
 * replace it with the single word "Error". These tests pin down that the
 * server's own words win, and that the three cases a user can act on
 * differently — bad input, no connection, our fault — stay distinguishable.
 */

import {
  apiErrorMessage,
  isNetworkError,
  serverMessage,
} from "../apiError";

/** Stand-in for i18next `t`: echoes the key so assertions name the key. */
const t = (key: string) => key;

/** Shape axios rejects with. */
function httpError(status: number, data: unknown) {
  return { response: { status, data } };
}

describe("serverMessage", () => {
  it("reads the Rails full_messages array", () => {
    const err = httpError(422, {
      errors: ["Price must be less than or equal to 9999999999.99"],
    });

    expect(serverMessage(err)).toBe(
      "Price must be less than or equal to 9999999999.99"
    );
  });

  it("shows every validation failure, not just the first", () => {
    const err = httpError(422, {
      errors: ["Title can't be blank", "Price must be greater than 0"],
    });

    expect(serverMessage(err)).toBe(
      "Title can't be blank Price must be greater than 0"
    );
  });

  it("reads a single { error } string", () => {
    const err = httpError(422, { error: "You cannot report your own listing" });

    expect(serverMessage(err)).toBe("You cannot report your own listing");
  });

  it("flattens field-keyed errors and names the field", () => {
    const err = httpError(422, { errors: { price: ["is too high"] } });

    expect(serverMessage(err)).toBe("Price is too high");
  });

  it("does not double-prefix a message that is already a sentence", () => {
    const err = httpError(422, {
      errors: { price: ["Price must be a number"] },
    });

    expect(serverMessage(err)).toBe("Price must be a number");
  });

  it("de-duplicates repeated messages", () => {
    const err = httpError(422, {
      errors: ["Price is too high", "Price is too high"],
    });

    expect(serverMessage(err)).toBe("Price is too high");
  });

  it("returns null when the body carries nothing usable", () => {
    expect(serverMessage(httpError(500, {}))).toBeNull();
    expect(serverMessage(httpError(500, null))).toBeNull();
    expect(serverMessage({})).toBeNull();
  });

  it("never shows an HTML error page as a message", () => {
    const err = httpError(500, "<!DOCTYPE html><title>500</title>");

    expect(serverMessage(err)).toBeNull();
  });

  it("caps a runaway server string", () => {
    const err = httpError(422, { errors: ["x".repeat(1000)] });

    expect(serverMessage(err)!.length).toBeLessThanOrEqual(240);
  });
});

describe("isNetworkError", () => {
  it("is true when the request never reached the API", () => {
    expect(isNetworkError({ code: "ERR_NETWORK", message: "Network Error" })).toBe(true);
    expect(isNetworkError({ code: "ECONNABORTED", message: "timeout of 20000ms" })).toBe(true);
  });

  it("is false when the API answered, even with an error", () => {
    expect(isNetworkError(httpError(500, {}))).toBe(false);
    expect(isNetworkError(httpError(422, { errors: ["nope"] }))).toBe(false);
  });
});

describe("apiErrorMessage", () => {
  it("prefers the server's sentence over the fallback key", () => {
    const err = httpError(422, {
      errors: ["Price must be less than or equal to 9999999999.99"],
    });

    expect(apiErrorMessage(err, t, "listing.form.saveError")).toBe(
      "Price must be less than or equal to 9999999999.99"
    );
  });

  it("tells the user to check their connection when offline", () => {
    const err = { code: "ERR_NETWORK", message: "Network Error" };

    expect(apiErrorMessage(err, t, "listing.form.saveError")).toBe(
      "common.errorNetwork"
    );
  });

  it("blames the server for a bodyless 5xx instead of the user's input", () => {
    expect(apiErrorMessage(httpError(500, {}), t, "listing.form.saveError")).toBe(
      "common.errorServer"
    );
  });

  it("falls back to the action's own key when there is nothing else", () => {
    expect(apiErrorMessage(httpError(400, {}), t, "listing.form.saveError")).toBe(
      "listing.form.saveError"
    );
  });

  it("defaults to common.error when no fallback key is given", () => {
    expect(apiErrorMessage(httpError(400, {}), t)).toBe("common.error");
  });
});
