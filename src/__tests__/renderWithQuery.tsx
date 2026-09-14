/**
 * `render` for components that fetch through React Query.
 *
 * UniversalList — and therefore every list screen built on it — moved from
 * hand-rolled `useState` fetching to `useInfiniteQuery`, so rendering one in a
 * test now needs a QueryClientProvider. This exists so that wrapper is written
 * ONCE rather than copied into each suite that renders a list.
 *
 * Two details are load-bearing, both learned from the migration:
 *
 *   * A FRESH client per render. These suites deliberately reuse the same
 *     config `id`, so a shared client would let one test's cached pages satisfy
 *     the next test's mount and silently skip the fetch it is asserting on.
 *
 *   * `rerender` RE-WRAPS. The library's `rerender` replaces the root element,
 *     so calling it with a bare component would drop the provider and throw
 *     "No QueryClient set" — on precisely the tests that exercise an id change
 *     or a filterItems closure swap. The same client is kept across the
 *     rerender, because those tests depend on seeing the cache the first render
 *     populated.
 *
 * `retry: false` keeps the error-state tests honest: React Query retries a
 * failed query three times with backoff by default, so they would otherwise sit
 * through seconds of retries before the error they assert on ever renders.
 */
import React from "react";
import { render as rtlRender } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrap = (node: React.ReactElement) => (
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>
  );
  const result = rtlRender(wrap(ui));
  return {
    ...result,
    rerender: (node: React.ReactElement) => result.rerender(wrap(node)),
  };
}
