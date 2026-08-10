/**
 * REVIEW PROBE 2 — delete after review.
 * refreshLoadedPages merges pages 1..N with no dedupe. Conversations are
 * ordered by last_message_at DESC, so a new/bumped conversation shifts the
 * page boundary and the same row lands on BOTH page 1 and page 2.
 */
import React from "react";
import { Text as RNText } from "react-native";
import { render, screen, waitFor, act } from "@testing-library/react-native";
import { FlashList } from "@shopify/flash-list";
import { UniversalList } from "../UniversalList";
import type { UniversalListConfig, ListQuery } from "../UniversalList";

jest.mock("lucide-react-native", () => ({
  WifiOff: "WifiOff",
  RotateCcw: "RotateCcw",
  Search: "Search",
}));

type SimpleItem = { id: number; label: string };
const renderItem = ({ item }: { item: SimpleItem }) => (
  <RNText testID={`item-${item.id}`}>{item.label}</RNText>
);
function buildConfig(
  overrides: Partial<UniversalListConfig<SimpleItem>> & {
    fetcher: UniversalListConfig<SimpleItem>["fetcher"];
  }
): UniversalListConfig<SimpleItem> {
  return { id: "probe2", keyExtractor: (i) => String(i.id), renderItem, ...overrides };
}

it("PROBE 3: focus refresh after a re-order duplicates a row", async () => {
  let bumped = false;
  const fetcher = jest.fn((q: ListQuery) => {
    if (!bumped) {
      return Promise.resolve(
        q.page === 1
          ? { items: [{ id: 1, label: "one" }, { id: 2, label: "two" }], totalCount: 4, totalPages: 2, currentPage: 1 }
          : { items: [{ id: 3, label: "three" }, { id: 4, label: "four" }], totalCount: 4, totalPages: 2, currentPage: 2 }
      );
    }
    // A new conversation (id 9) got bumped to the top -> everything shifts down
    // one slot, so id 2 now appears at the END of page 1 AND page 2 still has
    // its old boundary item.
    return Promise.resolve(
      q.page === 1
        ? { items: [{ id: 9, label: "nine" }, { id: 1, label: "one" }], totalCount: 5, totalPages: 3, currentPage: 1 }
        : { items: [{ id: 2, label: "two" }, { id: 3, label: "three" }], totalCount: 5, totalPages: 3, currentPage: 2 }
    );
  });

  const { rerender } = render(<UniversalList config={buildConfig({ fetcher, perPage: 2 })} />);
  await waitFor(() => expect(screen.getByTestId("item-1")).toBeTruthy());
  await act(async () => {
    const node = screen.UNSAFE_getByType(FlashList as never) as unknown as {
      props: { onEndReached?: () => void };
    };
    node.props.onEndReached?.();
  });
  await waitFor(() => expect(screen.getByTestId("item-3")).toBeTruthy());

  bumped = true;
  await act(async () => {
    rerender(<UniversalList config={buildConfig({ fetcher, perPage: 2, refreshKey: 1 })} />);
  });
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4));

  const node = screen.UNSAFE_getByType(FlashList as never) as unknown as {
    props: { data: SimpleItem[] };
  };
  const ids = node.props.data.map((i) => i.id);
  // eslint-disable-next-line no-console
  console.log("PROBE 3 merged ids after refresh:", JSON.stringify(ids));
  expect(new Set(ids).size).toBe(ids.length); // FAILS if duplicated
});
