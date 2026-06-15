import { useModeStore } from "@/stores/mode.store";
import { useAuthStore } from "@/stores/auth.store";
import BrowseScreen from "@/screens/buyer/Browse";
import MyListingsScreen from "@/screens/seller/MyListings";

export default function BrowseTab() {
  const mode = useModeStore((s) => s.mode);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // A signed-in seller's "home" is My Listings. Render that screen DIRECTLY here
  // rather than navigating to the my-listings tab.
  //
  // Why inline instead of <Redirect> / router.replace: during a live buyer→seller
  // switch the browse tab re-renders and fires the redirect in the same commit
  // that the tab layout is only just registering the my-listings route, so the
  // navigator hasn't got it yet → "The action 'REPLACE' with payload
  // {name:'my-listings'} was not handled by any navigator". Rendering the
  // component needs no navigation action, so that race cannot occur.
  if (mode === "seller" && isAuthenticated) {
    return <MyListingsScreen />;
  }

  return <BrowseScreen />;
}
