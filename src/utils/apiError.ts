/**
 * Turn an API failure into a sentence a person can act on.
 *
 * WHY THIS EXISTS
 * The backend already explains itself well. `render_unprocessable_entity`
 * (hatiwal-api/app/controllers/application_controller.rb) answers with either
 *
 *     { "errors": ["Price must be less than or equal to 9999999999.99"] }
 *     { "error":  "You cannot report your own listing" }
 *
 * but the app used to discard that and show `t("common.error")` — which is the
 * single word "Error" (تیروتنه / خطا) — in 10 of its 17 mutation error handlers.
 * The seller saw a failure with no reason and no way to fix it. That is the
 * "it failed but I don't know from where" class of bug: the information existed
 * and was thrown away at the last step.
 *
 * Rule: prefer what the server said. Fall back to a localized message only when
 * the server said nothing useful, and distinguish the three cases a user can
 * actually act on differently — bad input, no connection, our fault.
 */

/** Longest message we will show. Keeps a runaway server string out of the UI. */
const MAX_LEN = 240;

type ApiErrorBody = {
  errors?: string[] | Record<string, string[] | string> | null;
  error?: string | null;
  full_messages?: string[] | null;
  message?: string | null;
};

type MaybeAxiosError = {
  response?: { status?: number; data?: ApiErrorBody | string | null } | null;
  code?: string;
  message?: string;
};

/** Field-keyed errors ({ price: ["is too high"] }) flatten to plain sentences. */
function flatten(errors: NonNullable<ApiErrorBody["errors"]>): string[] {
  if (Array.isArray(errors)) return errors.filter((e) => typeof e === "string");

  return Object.entries(errors).flatMap(([field, value]) => {
    const list = Array.isArray(value) ? value : [value];
    return list
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      // Rails field errors ("is too long") read as fragments on their own, so
      // prefix the field unless the server already produced a full sentence.
      .map((v) => (/^[A-Z]/.test(v) ? v : `${humanizeField(field)} ${v}`));
  });
}

function humanizeField(field: string): string {
  const words = field.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The server's own words, if it gave any. */
export function serverMessage(err: unknown): string | null {
  const data = (err as MaybeAxiosError)?.response?.data;
  if (!data) return null;

  // Some endpoints answer with a bare string body.
  if (typeof data === "string") {
    const trimmed = data.trim();
    // Guard against an HTML error page being shown as a "message".
    if (!trimmed || trimmed.startsWith("<")) return null;
    return trimmed.slice(0, MAX_LEN);
  }

  const candidates: string[] = [];
  if (data.errors) candidates.push(...flatten(data.errors));
  if (Array.isArray(data.full_messages)) candidates.push(...data.full_messages);
  if (typeof data.error === "string") candidates.push(data.error);
  if (typeof data.message === "string") candidates.push(data.message);

  const usable = candidates.map((c) => c.trim()).filter(Boolean);
  if (usable.length === 0) return null;

  // Show every distinct validation failure, not just the first — a seller
  // fixing one field only to be told about the next is its own small cruelty.
  const unique = Array.from(new Set(usable));
  return unique.join(" ").slice(0, MAX_LEN);
}

/** True when the request never reached the API (offline, DNS, timeout). */
export function isNetworkError(err: unknown): boolean {
  const e = err as MaybeAxiosError;
  if (e?.response) return false;
  if (e?.code === "ECONNABORTED" || e?.code === "ETIMEDOUT") return true;
  if (e?.code === "ERR_NETWORK") return true;
  return /network|timeout/i.test(e?.message ?? "");
}

/**
 * The message to show the user.
 *
 * @param err       whatever the mutation rejected with
 * @param t         i18next `t`
 * @param fallback  translation key for this action, e.g. "listing.form.saveError"
 */
export function apiErrorMessage(
  err: unknown,
  t: (key: string) => string,
  fallback = "common.error"
): string {
  // No connection is the one case where the server has nothing to say and the
  // user genuinely can fix it themselves — say so plainly.
  if (isNetworkError(err)) return t("common.errorNetwork");

  const fromServer = serverMessage(err);
  if (fromServer) return fromServer;

  // 5xx with no body: our fault, and no amount of retrying the same input helps.
  const status = (err as MaybeAxiosError)?.response?.status ?? 0;
  if (status >= 500) return t("common.errorServer");

  return t(fallback);
}
