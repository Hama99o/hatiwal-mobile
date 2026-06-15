// Canonical public seller profile route (entry point for all existing navigation).
// ListingDetail and Conversation both push /(main)/seller/${id} — this route
// now renders the polished UserProfileScreen instead of the old SellerProfile.
// UserProfileScreen reads both "userId" and "id" params to support both routes.
import { UserProfileScreen } from "@/screens/shared/UserProfile";
export default UserProfileScreen;
