import SavedScreen from "@/screens/buyer/Saved";
import { GuestGuard } from "@/components/common/GuestGuard";

export default function SavedTab() {
  return (
    <GuestGuard returnTo="/(main)/(tabs)/saved">
      <SavedScreen />
    </GuestGuard>
  );
}
