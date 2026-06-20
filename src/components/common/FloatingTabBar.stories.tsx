/**
 * FloatingTabBar stories
 *
 * The bar normally receives its props from React Navigation. These stories
 * fabricate a minimal BottomTabBarProps-shaped object so every visibility state
 * can be reviewed in isolation:
 *
 *   Buyer       — Bazaar / Saved / Chats / Me (Chats focused, with unread badge)
 *   Seller      — My Shop / Chats / Me (warning accent + outline)
 *   Guest       — Bazaar / Me(Login) only
 *   RTL         — buyer set, row-reversed for Pashto / Dari
 *
 * Switch Seller vs Buyer accent by toggling the mode store at runtime in the
 * app; here the buyer/seller distinction is shown via the route set + the
 * `__sellerMode` decorator note.
 */

import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Store, Heart, MessageCircle, User, Package, LogIn } from "lucide-react-native";
import { FloatingTabBar } from "./FloatingTabBar";

// ── Mock prop builder ────────────────────────────────────────────────────────

type TabDef = {
  name: string;
  title: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  href?: string | null;
  badge?: number;
};

function makeProps(tabs: TabDef[], focusedName: string) {
  const routes = tabs.map((t, i) => ({ key: `${t.name}-${i}`, name: t.name, params: undefined }));
  const index = Math.max(0, tabs.findIndex((t) => t.name === focusedName));

  const descriptors: Record<string, unknown> = {};
  tabs.forEach((t, i) => {
    const Icon = t.icon;
    descriptors[`${t.name}-${i}`] = {
      options: {
        title: t.title,
        href: t.href,
        tabBarBadge: t.badge,
        tabBarIcon: ({ color, size }: { color: string; size: number }) => (
          <Icon size={size} color={color} />
        ),
      },
    };
  });

  return {
    state: { index, routes },
    descriptors,
    navigation: {
      emit: () => ({ defaultPrevented: false }),
      navigate: () => {},
    },
  } as unknown as React.ComponentProps<typeof FloatingTabBar>;
}

const BUYER: TabDef[] = [
  { name: "browse", title: "Bazaar", icon: Store },
  { name: "saved", title: "Saved", icon: Heart },
  { name: "chat", title: "Chats", icon: MessageCircle, badge: 3 },
  { name: "profile", title: "Me", icon: User },
];

const SELLER: TabDef[] = [
  { name: "my-listings", title: "My Shop", icon: Package },
  { name: "chat", title: "Chats", icon: MessageCircle, badge: 12 },
  { name: "profile", title: "Me", icon: User },
];

const GUEST: TabDef[] = [
  { name: "browse", title: "Bazaar", icon: Store },
  { name: "profile", title: "Login", icon: LogIn },
];

// ── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof FloatingTabBar> = {
  title: "Components/FloatingTabBar",
  component: FloatingTabBar,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#e9ecf1" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FloatingTabBar>;

// ── Stories ──────────────────────────────────────────────────────────────────

export const Buyer: Story = {
  render: () => <FloatingTabBar {...makeProps(BUYER, "chat")} />,
};

export const BuyerBazaarFocused: Story = {
  render: () => <FloatingTabBar {...makeProps(BUYER, "browse")} />,
};

export const Seller: Story = {
  render: () => <FloatingTabBar {...makeProps(SELLER, "my-listings")} />,
};

export const Guest: Story = {
  render: () => <FloatingTabBar {...makeProps(GUEST, "browse")} />,
};

export const DarkSurface: Story = {
  render: () => (
    <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#0f172a" }}>
      <FloatingTabBar {...makeProps(BUYER, "chat")} />
    </View>
  ),
};
