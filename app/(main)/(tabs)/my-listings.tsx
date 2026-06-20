import MyListingsScreen from "@/screens/seller/MyListings";
import { GuestGuard } from "@/components/common/GuestGuard";

export default function MyListingsTab() {
  return (
    <GuestGuard returnTo="/(main)/(tabs)/my-listings">
      <MyListingsScreen />
    </GuestGuard>
  );
}
