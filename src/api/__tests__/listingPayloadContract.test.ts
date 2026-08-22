/**
 * THE GUARD: every field the listing form collects must actually be sent.
 *
 * `createListingWithImages` / `updateListingWithImages` hand-roll their
 * multipart body field by field. That makes them an ALLOW-LIST, and an
 * allow-list silently drops anything nobody remembered to add — with no type
 * error, no lint warning, and no failing test, because the form is right and the
 * backend is right and only the wire is wrong.
 *
 * That is not hypothetical: `quantity` was missing for the entire life of the
 * multi-quantity feature. A seller typed 15, the input held 15, the listing
 * saved as 1, and the whole feature was dead on the path that creates it. It
 * took a device run to find (QA run-041), because every unit test asserted the
 * value reached the function's ARGUMENTS — one layer above the bug.
 *
 * So this test compares the form's zod schema against the keys each builder puts
 * on the wire, by reading both files. Parsing source in a test is unusual, and
 * it is deliberate: nothing else can see the gap. A field added to the schema
 * without a matching `form.append` fails here immediately, naming the field.
 *
 * If this breaks after a refactor, fix the regexes — do NOT delete the test.
 * Prefer replacing it with a builder derived from one field map, which would
 * remove the bug class instead of guarding it.
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function toSnake(s: string): string {
  return s.replace(/([A-Z])/g, (m) => "_" + m.toLowerCase());
}

/** Field names in `const listingSchema = z.object({ ... })`. */
function formSchemaFields(): string[] {
  const src = read("screens/seller/ListingForm.tsx");
  const m = src.match(/const listingSchema = z\.object\(\{([\s\S]*?)\n\}\)/);
  if (!m) throw new Error("listingSchema not found — update this regex, do not delete the test");
  return [...m[1].matchAll(/^ {2}(\w+):/gm)].map((x) => x[1]);
}

/** `listing[...]` keys appended inside one builder. */
function sentFields(builder: "create" | "update"): string[] {
  const src = read("api/listings.ts");
  const start = src.indexOf(
    builder === "create" ? "createListingWithImages" : "updateListingWithImages"
  );
  const end =
    builder === "create" ? src.indexOf("updateListingWithImages") : start + 4000;
  const body = src.slice(start, end);
  return [...body.matchAll(/listing\[(\w+)\]/g)].map((x) => x[1]);
}

describe("listing payload contract", () => {
  it("the form's schema is discoverable (guards the regex itself)", () => {
    const fields = formSchemaFields();
    expect(fields.length).toBeGreaterThan(8);
    expect(fields).toContain("quantity");
    expect(fields).toContain("title");
  });

  it.each(["create", "update"] as const)(
    "%s sends every field the form collects",
    (builder) => {
      const sent = new Set(sentFields(builder));
      const missing = formSchemaFields()
        .map(toSnake)
        .filter((f) => !sent.has(f));

      expect(missing).toEqual([]);
    }
  );

  it("both builders send quantity — the field this guard exists for", () => {
    expect(sentFields("create")).toContain("quantity");
    expect(sentFields("update")).toContain("quantity");
  });
});
