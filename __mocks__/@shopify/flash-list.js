/**
 * Manual Jest mock for @shopify/flash-list.
 *
 * FlashList is a native Fabric module that cannot run in the Jest/jsdom
 * environment. This stub exercises renderItem and ListHeaderComponent
 * correctly so UniversalList tests (and any other test that uses FlashList)
 * see the items rendered by their renderItem prop.
 *
 * It is a plain CommonJS file so NativeWind's Babel transform does NOT
 * inject _ReactNativeCSSInterop into its output — avoiding the jest.mock()
 * factory hoisting check that forbids out-of-scope variable references.
 */

const React = require("react");

function FlashList(props) {
  const data = props.data || [];
  const renderItem = props.renderItem;
  const keyExtractor = props.keyExtractor;
  const ListHeaderComponent = props.ListHeaderComponent || null;
  const ListFooterComponent = props.ListFooterComponent || null;

  const renderedItems = data.map(function (item, index) {
    const rendered = renderItem({ item: item, index: index });
    if (!rendered) return null;
    const key = keyExtractor ? keyExtractor(item, index) : String(index);
    return React.cloneElement(rendered, { key: key });
  });

  // Use React.Fragment to wrap — avoids any NativeWind host-component transform
  return React.createElement(
    React.Fragment,
    null,
    ListHeaderComponent,
    renderedItems,
    ListFooterComponent
  );
}

FlashList.displayName = "FlashList";

module.exports = { FlashList: FlashList };
