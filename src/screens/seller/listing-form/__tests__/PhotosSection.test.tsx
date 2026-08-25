/**
 * PhotosSection unit tests — TASK-P736 (review fix, test coverage).
 *
 * This round changed the component's behaviour (RTL corner-anchoring
 * convention, the Cover badge type scale, the sheet chrome, and removed an
 * unreachable dead-code branch) with zero prior Jest coverage — this file
 * closes that gap.
 *
 * Covers:
 *  1. Empty state — renders the dashed "Add Photos" card, the required " *"
 *     marker, and opens the source picker on tap.
 *  2. `error` prop — renders `FieldError` with the message in BOTH the
 *     empty state and the with-photos strip, and renders nothing when
 *     omitted.
 *  3. `removePhoto` — tapping a thumb's ✕ removes exactly that photo and
 *     calls `onChange` with the rest, preserving order.
 *  4. `promoteToFirst` — tapping the ★ on a non-cover photo moves it to
 *     index 0 without dropping or duplicating any other photo.
 *  5. `handleThumbPress` reorder/swap — long-press selects a photo, tapping
 *     the same photo again deselects it, and tapping a DIFFERENT photo
 *     swaps the two.
 *  6. The photo counter is localized via `useLocalization().formatNumber`
 *     (TASK-P736 review fix) rather than printed as raw ASCII digits.
 *  7. `canAddMore` — the "+" tile is hidden once `photos.length === maxPhotos`.
 *  8. RTL — renders without throwing when `isRtl` is true.
 *
 * useColors/useTranslation are mocked globally in src/__tests__/setup.ts.
 * expo-image is mocked globally too, so RemoteImage renders as a plain host
 * "Image" element — no extra mock needed here.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  Camera: "Camera",
  ImageIcon: "ImageIcon",
  Plus: "Plus",
  Star: "Star",
  X: "X",
  ArrowLeftRight: "ArrowLeftRight",
  AlertCircle: "AlertCircle",
}));

// useLocalization is mocked as a jest.fn() so individual tests can override
// isRtl / formatNumber via mockReturnValueOnce without needing jest.doMock.
const mockUseLocalization = jest.fn(() => ({
  isRtl: false,
  formatNumber: (n: number) => String(n),
}));
jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: (...args: unknown[]) => mockUseLocalization(...args),
}));

// expo-image-picker / react-native's ActionSheetIOS are only ever reached
// via the "add a photo" entry points (not exercised by these tests, which
// pass photos in directly), but the module is still imported at load time —
// stub it so import never depends on a native module under Jest.
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied" }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied" }),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock("@/lib/animation/useReduceMotion", () => ({
  useReduceMotion: jest.fn(() => false),
}));

jest.mock("@/lib/animation/haptics", () => ({
  triggerHaptic: jest.fn(),
}));

jest.mock("@/lib/toast", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

// Import AFTER mocks
import { PhotosSection, PhotoItem } from "../PhotosSection";
import * as ImagePicker from "expo-image-picker";
import { AccessibilityInfo } from "react-native";
import { toast } from "@/lib/toast";

const mockPicker = ImagePicker as unknown as {
  requestMediaLibraryPermissionsAsync: jest.Mock;
  launchImageLibraryAsync: jest.Mock;
};
const mockToast = toast as unknown as { error: jest.Mock };

const ORIGINAL_PLATFORM_OS = Platform.OS;

afterEach(() => {
  mockUseLocalization.mockReturnValue({ isRtl: false, formatNumber: (n: number) => String(n) });
  Platform.OS = ORIGINAL_PLATFORM_OS;
  jest.clearAllMocks();
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makePhotos(n: number): PhotoItem[] {
  return Array.from({ length: n }, (_, i) => ({ uri: `file:///photo${i}.jpg` }));
}

function baseProps(overrides: Partial<React.ComponentProps<typeof PhotosSection>> = {}) {
  return {
    photos: [] as PhotoItem[],
    onChange: jest.fn(),
    ...overrides,
  };
}

// ── 1. Empty state ───────────────────────────────────────────────────────────

describe("PhotosSection — empty state", () => {
  it("renders the dashed add-photos card with the required marker", () => {
    render(<PhotosSection {...baseProps()} />);
    // FieldLabel renders the label and the required " *" marker as nested
    // Text nodes, so the label's full text content is "listing.form.photos *".
    expect(screen.getByText(/^listing\.form\.photos\s*\*$/)).toBeTruthy();
    expect(screen.getByText("listing.form.addPhotos")).toBeTruthy();
  });

  it("opens the source picker (Android Modal) when the add card is tapped", () => {
    // showSourcePicker branches on Platform.OS — force the Android/raw-Modal
    // path so this test doesn't depend on ActionSheetIOS (the iOS branch).
    Platform.OS = "android";
    render(<PhotosSection {...baseProps()} />);
    fireEvent.press(screen.getByTestId("photos-add-button"));
    // The sheet's gallery/camera rows become visible once opened.
    expect(screen.getByTestId("photos-add-button-gallery")).toBeTruthy();
    expect(screen.getByTestId("photos-add-button-camera")).toBeTruthy();
  });
});

// ── 2. error prop ─────────────────────────────────────────────────────────────

describe("PhotosSection — error prop", () => {
  it("renders the error message in the empty state", () => {
    render(<PhotosSection {...baseProps({ error: "listing.form.photoRequired" })} />);
    expect(screen.getByText("listing.form.photoRequired")).toBeTruthy();
  });

  it("renders the error message in the with-photos strip too", () => {
    render(
      <PhotosSection {...baseProps({ photos: makePhotos(2), error: "listing.form.photoRequiredLive" })} />
    );
    expect(screen.getByText("listing.form.photoRequiredLive")).toBeTruthy();
  });

  it("renders no error when the prop is omitted", () => {
    render(<PhotosSection {...baseProps({ photos: makePhotos(1) })} />);
    expect(screen.queryByText(/photoRequired/)).toBeNull();
  });
});

// ── 3. removePhoto ────────────────────────────────────────────────────────────

describe("PhotosSection — removePhoto", () => {
  it("removes exactly the tapped photo, preserving order of the rest", () => {
    const photos = makePhotos(3);
    const onChange = jest.fn();
    render(<PhotosSection {...baseProps({ photos, onChange })} />);

    // Each thumb (except when selected) renders a remove (✕) button.
    const removeButtons = screen.getAllByTestId("listing-form-photo-remove");
    expect(removeButtons).toHaveLength(3);
    // Remove the SECOND photo (index 1).
    fireEvent.press(removeButtons[1]);

    expect(onChange).toHaveBeenCalledWith([photos[0], photos[2]]);
  });
});

// ── 4. promoteToFirst ─────────────────────────────────────────────────────────

describe("PhotosSection — promoteToFirst", () => {
  it("moves a non-cover photo to index 0 without dropping any photo", () => {
    const photos = makePhotos(3);
    const onChange = jest.fn();
    render(<PhotosSection {...baseProps({ photos, onChange })} />);

    // The ★ "set as cover" button only renders for non-first photos (2 here).
    const starButtons = screen.getAllByTestId("listing-form-photo-promote");
    expect(starButtons).toHaveLength(2);
    fireEvent.press(starButtons[0]); // promote index 1 ("photo1") to cover

    expect(onChange).toHaveBeenCalledWith([photos[1], photos[0], photos[2]]);
  });
});

// ── 5. handleThumbPress reorder/swap ──────────────────────────────────────────

describe("PhotosSection — reorder/swap", () => {
  it("long-pressing a thumb enters select mode and shows the reorder hint", () => {
    const photos = makePhotos(3);
    render(<PhotosSection {...baseProps({ photos })} />);

    expect(screen.queryByText("listing.form.reorderHint")).toBeNull();
    fireEvent(screen.getAllByTestId("listing-form-photo-thumb")[0], "longPress");
    expect(screen.getByText("listing.form.reorderHint")).toBeTruthy();
  });

  it("tapping the SAME selected photo again deselects it (no onChange call)", () => {
    const photos = makePhotos(3);
    const onChange = jest.fn();
    render(<PhotosSection {...baseProps({ photos, onChange })} />);

    const thumbs = screen.getAllByTestId("listing-form-photo-thumb");
    fireEvent(thumbs[0], "longPress");
    fireEvent.press(thumbs[0]);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText("listing.form.reorderHint")).toBeNull();
  });

  it("tapping a DIFFERENT photo while one is selected swaps the two", () => {
    const photos = makePhotos(3);
    const onChange = jest.fn();
    render(<PhotosSection {...baseProps({ photos, onChange })} />);

    const thumbs = screen.getAllByTestId("listing-form-photo-thumb");
    fireEvent(thumbs[0], "longPress"); // select index 0
    fireEvent.press(thumbs[2]); // swap with index 2

    expect(onChange).toHaveBeenCalledWith([photos[2], photos[1], photos[0]]);
  });
});

// ── 6. Localized counter ──────────────────────────────────────────────────────

describe("PhotosSection — photo counter", () => {
  it("formats the count/max through useLocalization().formatNumber, not raw ASCII digits", () => {
    const formatNumber = jest.fn((n: number) => `۝${n}۝`);
    mockUseLocalization.mockReturnValue({ isRtl: false, formatNumber });

    render(<PhotosSection {...baseProps({ photos: makePhotos(3), maxPhotos: 8 })} />);

    expect(formatNumber).toHaveBeenCalledWith(3);
    expect(formatNumber).toHaveBeenCalledWith(8);
    expect(screen.getByText("۝3۝/۝8۝")).toBeTruthy();
  });
});

// ── 7. canAddMore ──────────────────────────────────────────────────────────────

describe("PhotosSection — max photos reached", () => {
  it("hides the + add tile once photos.length === maxPhotos", () => {
    render(<PhotosSection {...baseProps({ photos: makePhotos(2), maxPhotos: 2 })} />);
    expect(screen.queryAllByTestId("photos-add-button")).toHaveLength(0);
  });

  it("shows the + add tile while under the max", () => {
    render(<PhotosSection {...baseProps({ photos: makePhotos(1), maxPhotos: 2 })} />);
    expect(screen.getByTestId("photos-add-button")).toBeTruthy();
  });
});

// ── 8. RTL ────────────────────────────────────────────────────────────────────

describe("PhotosSection — RTL", () => {
  it("renders without throwing in RTL (empty state)", () => {
    mockUseLocalization.mockReturnValue({ isRtl: true, formatNumber: (n: number) => String(n) });
    expect(() => render(<PhotosSection {...baseProps()} />)).not.toThrow();
  });

  it("renders without throwing in RTL (with photos)", () => {
    mockUseLocalization.mockReturnValue({ isRtl: true, formatNumber: (n: number) => String(n) });
    expect(() => render(<PhotosSection {...baseProps({ photos: makePhotos(3) })} />)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// "Nothing silent" — a seller must always be told why a photo did not arrive.
// A listing cannot be published without a photo, so a silent failure here is a
// dead end with no explanation.
describe("PhotosSection — failures are always reported", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Android: the source picker is a plain <Modal>. On iOS it is ActionSheetIOS,
    // whose native manager does not exist under Jest — the same reason the
    // existing suite pins the platform before pressing this button.
    Platform.OS = "android";
    mockPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      status: "granted",
      accessPrivileges: "all",
    });
  });

  afterEach(() => {
    Platform.OS = ORIGINAL_PLATFORM_OS;
  });

  it("reports it when the photo picker throws instead of failing silently", async () => {
    // Real causes: an unreadable file, a provider crash, memory pressure on a
    // full-res photo. Before this, the rejection went nowhere at all.
    mockPicker.launchImageLibraryAsync.mockRejectedValue(new Error("provider died"));
    const onChange = jest.fn();
    render(<PhotosSection photos={[]} onChange={onChange} />);

    fireEvent.press(screen.getByTestId("photos-add-button"));
    await waitFor(() =>
      expect(screen.getByTestId("photos-add-button-gallery")).toBeTruthy()
    );
    fireEvent.press(screen.getByTestId("photos-add-button-gallery"));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("listing.form.photoPickFailed")
    );
    // ...and announced, because a toast alone is silence for a screen reader.
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      "listing.form.photoPickFailed"
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("caps an over-limit selection AND says how many were dropped", async () => {
    // `selectionLimit` is a request, not a guarantee — some OEM pickers ignore it.
    const already: PhotoItem[] = [{ uri: "a" }, { uri: "b" }];
    mockPicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "c" }, { uri: "d" }, { uri: "e" }],
    });
    const onChange = jest.fn();
    render(<PhotosSection photos={already} onChange={onChange} maxPhotos={3} />);

    fireEvent.press(screen.getByTestId("photos-add-button"));
    await waitFor(() =>
      expect(screen.getByTestId("photos-add-button-gallery")).toBeTruthy()
    );
    fireEvent.press(screen.getByTestId("photos-add-button-gallery"));

    // Only the one remaining slot is filled...
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith([...already, { uri: "c" }]);
    // ...and the seller is told the other two did not make it.
    expect(mockToast.error).toHaveBeenCalledWith("listing.form.photoLimitReached");
  });
});
