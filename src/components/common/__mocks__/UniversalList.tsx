import React from "react";
import { View, Text } from "react-native";

/**
 * Manual jest mock for UniversalList (TASK-R517).
 *
 * Lives in `__mocks__/` rather than an inline `jest.mock(..., factory)` on
 * purpose — see `common/__mocks__/BuyerPickerSheet.tsx` and
 * `chat/conversations/__mocks__/ConversationRow.tsx`: a hoisted mock factory
 * that BOTH requires a module (`require("react-native")`) AND returns a JSX
 * element crashes babel-plugin-jest-hoist in this toolchain
 * ("VariableDeclaration ... declarations[0] ... undefined"). A manual mock is
 * a normal module — no hoisting — so JSX + imports work.
 *
 * Minimal stand-in used by screen-level unit tests (mirrors the inline
 * fetch-once-on-mount pattern already used by HiddenListings.test.tsx /
 * BlockedUsers.test.tsx): calls `config.fetcher` whenever
 * `config.id`/`config.refreshKey` changes, and renders either the fetched
 * items (via `config.renderItem`) or the empty state (`config.emptyTitle` +
 * optional `config.emptyAction`). Enable per-suite with a bare
 * `jest.mock("@/components/common/UniversalList")`.
 */
export function UniversalList({ config }: { config: Record<string, any> }) {
  const [state, setState] = React.useState<{ items: any[]; loaded: boolean }>({
    items: [],
    loaded: false,
  });

  React.useEffect(() => {
    let cancelled = false;
    config
      .fetcher({ page: 1, perPage: config.perPage ?? 20 })
      .then((result: { items: any[] }) => {
        if (!cancelled) setState({ items: result.items, loaded: true });
      })
      .catch(() => {
        if (!cancelled) setState({ items: [], loaded: true });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.id, config.fetcher, config.refreshKey]);

  if (!state.loaded) {
    return <View testID="universal-list-loading" />;
  }

  if (state.items.length === 0) {
    return (
      <View testID="universal-list-empty">
        <Text>{config.emptyTitle}</Text>
        {config.emptyAction ? (
          <Text testID="empty-action" onPress={config.emptyAction.onPress}>
            {config.emptyAction.label}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View testID="universal-list">
      {state.items.map((item: { id: number }) => {
        const rendered = config.renderItem({ item, index: 0 });
        return rendered ? React.cloneElement(rendered, { key: String(item.id) }) : null;
      })}
    </View>
  );
}
