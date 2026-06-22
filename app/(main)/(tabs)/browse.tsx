import { useRef } from "react";
import { View } from "react-native";
import { useModeStore } from "@/stores/mode.store";
import { useAuthStore } from "@/stores/auth.store";
import BrowseScreen from "@/screens/buyer/Browse";
import MyListingsScreen from "@/screens/seller/MyListings";

export default function BrowseTab() {
  const mode = useModeStore((s) => s.mode);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const showSeller = mode === "seller" && isAuthenticated;

  // Keep MyListingsScreen mounted once it is first shown so React never resets
  // its local state (items, pagination, search) on subsequent tab switches or
  // store re-renders. Without this, every visit creates a fresh mount → items
  // reset to [] → skeleton + double-fetch on every navigation.
  //
  // The pattern:
  //   • Before the user is identified as a seller: sellerEverMounted=false →
  //     only BrowseScreen is rendered.
  //   • First time showSeller becomes true: sellerEverMounted=true →
  //     MyListingsScreen mounts (skeleton on first load is expected here).
  //   • All subsequent tab switches / store updates: sellerEverMounted stays
  //     true → MyListingsScreen keeps its mounted instance, BrowseScreen is
  //     not rendered (unmounted when seller mode is active).
  //
  // Why NOT `display: "none"` for both simultaneously: if both were always
  // mounted, each would respond to focus events and make unnecessary API calls.
  // Keeping only ONE mounted at a time prevents wasted fetches.
  const sellerEverMounted = useRef(showSeller);
  if (showSeller) sellerEverMounted.current = true;

  if (showSeller) {
    // Seller view — MyListingsScreen is the only rendered component.
    return <MyListingsScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Keep MyListingsScreen alive in the tree (hidden) so its state is
          preserved when the user briefly enters buyer mode or the store
          re-hydrates. display:"none" hides it without unmounting. */}
      {sellerEverMounted.current && (
        <View style={{ flex: 1, display: "none" }}>
          <MyListingsScreen />
        </View>
      )}
      <BrowseScreen />
    </View>
  );
}
