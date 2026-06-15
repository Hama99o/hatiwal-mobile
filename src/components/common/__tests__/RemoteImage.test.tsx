/**
 * RemoteImage unit tests
 *
 * Verifies the core contract of the RemoteImage wrapper:
 *  - source uri passed through when given, undefined when uri is null/undefined
 *  - default LISTING_BLURHASH placeholder used by default
 *  - blurhash={false} disables the placeholder entirely
 *  - default contentFit="cover" and transition=250 applied
 *  - contentFit and transition are overridable
 *  - additional expo-image props pass straight through (testID, accessibilityLabel, style)
 *
 * expo-image is mocked in setup.ts as { Image: "Image" } so the rendered
 * JSON tree exposes all props directly — we inspect toJSON().props.
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { RemoteImage } from "../RemoteImage";
import { LISTING_BLURHASH } from "@/constants/images";

// ── helpers ───────────────────────────────────────────────────────────────────

/** Pull the props off the single root "Image" node. */
function getImageProps(jsx: React.ReactElement): Record<string, unknown> {
  const { toJSON } = render(jsx);
  const tree = toJSON() as {
    type: string;
    props: Record<string, unknown>;
    children: unknown;
  } | null;
  expect(tree).not.toBeNull();
  expect(tree?.type).toBe("Image");
  return tree?.props ?? {};
}

// ── 1. source / uri ───────────────────────────────────────────────────────────

describe("RemoteImage — source prop", () => {
  it("sets source.uri when a non-empty uri string is provided", () => {
    const props = getImageProps(
      <RemoteImage uri="https://example.com/photo.jpg" />
    );
    expect(props.source).toEqual({ uri: "https://example.com/photo.jpg" });
  });

  it("sets source to undefined when uri is null", () => {
    const props = getImageProps(<RemoteImage uri={null} />);
    expect(props.source).toBeUndefined();
  });

  it("sets source to undefined when uri is undefined", () => {
    const props = getImageProps(<RemoteImage />);
    expect(props.source).toBeUndefined();
  });
});

// ── 2. placeholder / blurhash ─────────────────────────────────────────────────

describe("RemoteImage — placeholder prop", () => {
  it("uses the default LISTING_BLURHASH placeholder when no blurhash prop is given", () => {
    const props = getImageProps(<RemoteImage uri="https://example.com/photo.jpg" />);
    expect(props.placeholder).toEqual({ blurhash: LISTING_BLURHASH });
  });

  it("uses the default LISTING_BLURHASH placeholder even when uri is null (empty tile)", () => {
    const props = getImageProps(<RemoteImage uri={null} />);
    expect(props.placeholder).toEqual({ blurhash: LISTING_BLURHASH });
  });

  it("uses a custom blurhash string when provided", () => {
    const custom = "LKN]Rv%2Tw=w]~RBVZRi};RPxuwH";
    const props = getImageProps(
      <RemoteImage uri="https://example.com/photo.jpg" blurhash={custom} />
    );
    expect(props.placeholder).toEqual({ blurhash: custom });
  });

  it("sets placeholder to undefined when blurhash={false}", () => {
    const props = getImageProps(
      <RemoteImage uri="https://example.com/photo.jpg" blurhash={false} />
    );
    expect(props.placeholder).toBeUndefined();
  });

  it("sets placeholder to undefined when blurhash={false} and uri is null", () => {
    const props = getImageProps(<RemoteImage uri={null} blurhash={false} />);
    expect(props.placeholder).toBeUndefined();
  });
});

// ── 3. contentFit defaults and override ───────────────────────────────────────

describe("RemoteImage — contentFit prop", () => {
  it("defaults contentFit to 'cover'", () => {
    const props = getImageProps(<RemoteImage uri="https://example.com/photo.jpg" />);
    expect(props.contentFit).toBe("cover");
  });

  it("passes through a custom contentFit value", () => {
    const props = getImageProps(
      <RemoteImage uri="https://example.com/photo.jpg" contentFit="contain" />
    );
    expect(props.contentFit).toBe("contain");
  });

  it("passes through contentFit='fill'", () => {
    const props = getImageProps(
      <RemoteImage uri="https://example.com/photo.jpg" contentFit="fill" />
    );
    expect(props.contentFit).toBe("fill");
  });
});

// ── 4. transition defaults and override ───────────────────────────────────────

describe("RemoteImage — transition prop", () => {
  it("defaults transition to 250", () => {
    const props = getImageProps(<RemoteImage uri="https://example.com/photo.jpg" />);
    expect(props.transition).toBe(250);
  });

  it("passes through a custom transition duration", () => {
    const props = getImageProps(
      <RemoteImage uri="https://example.com/photo.jpg" transition={300} />
    );
    expect(props.transition).toBe(300);
  });

  it("passes through transition=0 (no animation)", () => {
    const props = getImageProps(
      <RemoteImage uri="https://example.com/photo.jpg" transition={0} />
    );
    expect(props.transition).toBe(0);
  });
});

// ── 5. prop pass-through ──────────────────────────────────────────────────────

describe("RemoteImage — additional prop pass-through", () => {
  it("forwards testID to the underlying Image", () => {
    const props = getImageProps(
      <RemoteImage uri="https://example.com/photo.jpg" testID="listing-image" />
    );
    expect(props.testID).toBe("listing-image");
  });

  it("forwards accessibilityLabel to the underlying Image", () => {
    const props = getImageProps(
      <RemoteImage
        uri="https://example.com/photo.jpg"
        accessibilityLabel="Listing photo"
      />
    );
    expect(props.accessibilityLabel).toBe("Listing photo");
  });

  it("forwards style to the underlying Image", () => {
    const style = { width: 200, height: 200 };
    const props = getImageProps(
      <RemoteImage uri="https://example.com/photo.jpg" style={style} />
    );
    expect(props.style).toEqual(style);
  });

  it("forwards multiple extra props simultaneously", () => {
    const props = getImageProps(
      <RemoteImage
        uri="https://example.com/photo.jpg"
        testID="my-image"
        accessibilityLabel="My label"
        contentFit="contain"
        transition={0}
      />
    );
    expect(props.testID).toBe("my-image");
    expect(props.accessibilityLabel).toBe("My label");
    expect(props.contentFit).toBe("contain");
    expect(props.transition).toBe(0);
  });
});

// ── 6. smoke tests ────────────────────────────────────────────────────────────

describe("RemoteImage — smoke tests", () => {
  it("renders without throwing with just a uri", () => {
    expect(() =>
      render(<RemoteImage uri="https://example.com/photo.jpg" />)
    ).not.toThrow();
  });

  it("renders without throwing with no props", () => {
    expect(() => render(<RemoteImage />)).not.toThrow();
  });

  it("renders without throwing with uri=null and blurhash=false", () => {
    expect(() => render(<RemoteImage uri={null} blurhash={false} />)).not.toThrow();
  });
});
