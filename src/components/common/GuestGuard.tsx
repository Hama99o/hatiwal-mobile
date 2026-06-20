/**
 * GuestGuard — blocks logged-out users from a private screen.
 *
 * Hatiwal lets guests browse the Bazaar feed and view public profiles, but the
 * Saved, My Shop (my-listings), and Chats screens are account-only. The bottom
 * tab bar already hides those tabs from guests, and the backend hard-401s their
 * data — this is the third layer: if a guest reaches one of these routes by
 * deep link or programmatic navigation, send them to login (with a returnTo so
 * they land back here afterwards) instead of rendering a screen that fires an
 * authenticated request and shows a misleading empty/error state.
 *
 * Used at the route-file level so the wrapped screen's hooks are never mounted
 * for a guest (no conditional-hook hazard).
 */

import React from "react";
import { Redirect } from "expo-router";
import { useRequireAuth } from "@/hooks/useRequireAuth";

interface GuestGuardProps {
  /** Route to return to after a successful login, e.g. "/(main)/(tabs)/saved". */
  returnTo: string;
  children: React.ReactNode;
}

export function GuestGuard({ returnTo, children }: GuestGuardProps) {
  const { isAuthenticated } = useRequireAuth();

  if (!isAuthenticated) {
    return <Redirect href={{ pathname: "/(auth)/login", params: { returnTo } }} />;
  }

  return <>{children}</>;
}
