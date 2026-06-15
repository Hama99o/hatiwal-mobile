/**
 * LanguageSwitcher stories
 *
 * Covers all per-locale active states (en / ps / fa), plus dark-surface and
 * RTL-layout variants required by docs/TESTING.md.
 *
 * Story inventory:
 *   EnglishActive  — LTR, light background, English button highlighted
 *   PashtoActive   — LTR, light background, Pashto button highlighted
 *   DariActive     — LTR, light background, Dari button highlighted
 *   DarkSurface    — dark background, English active; verifies useColors() tokens
 *   RTL            — RTL container, Pashto active; verifies mirrored flex layout
 *
 * NOTE: AllStates was removed.  The synchronous i18n.changeLanguage() calls
 * inside a single render() function all completed before React committed any
 * element, so every row rendered with the final language (English).  The three
 * separate per-locale stories above cover the same ground correctly because
 * each story's decorator runs inside its own React subtree before the component
 * mounts.
 */

import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import i18n from "@/i18n";
import LanguageSwitcher from "./LanguageSwitcher";

const meta: Meta<typeof LanguageSwitcher> = {
  title: "Components/LanguageSwitcher",
  component: LanguageSwitcher,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, backgroundColor: "#f8f8f8" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LanguageSwitcher>;

// ─── Per-locale active states ─────────────────────────────────────────────────

/**
 * English active (default LTR).
 * The English button should appear with primary background and bold white text.
 */
export const EnglishActive: Story = {
  decorators: [
    (Story) => {
      i18n.changeLanguage("en");
      return <Story />;
    },
  ],
};

/**
 * Pashto active.
 * The پښتو button should appear with primary background and bold white text.
 */
export const PashtoActive: Story = {
  decorators: [
    (Story) => {
      i18n.changeLanguage("ps");
      return <Story />;
    },
  ],
};

/**
 * Dari active.
 * The دری button should appear with primary background and bold white text.
 */
export const DariActive: Story = {
  decorators: [
    (Story) => {
      i18n.changeLanguage("fa");
      return <Story />;
    },
  ],
};

// ─── Dark surface ─────────────────────────────────────────────────────────────

/**
 * Dark background — verifies that useColors() tokens are used (no hardcoded
 * colors).  If the inactive border or text becomes invisible, a hardcoded
 * light-mode color has leaked into the component.
 *
 * English is active so the primary highlight is clearly visible on the dark
 * surface.
 */
export const DarkSurface: Story = {
  decorators: [
    (Story) => {
      i18n.changeLanguage("en");
      return (
        <View style={{ padding: 24, backgroundColor: "#0f172a" }}>
          <Story />
        </View>
      );
    },
  ],
};

// ─── RTL layout ───────────────────────────────────────────────────────────────

/**
 * RTL container with Pashto active.
 * The row of buttons should be mirrored (Dari leftmost, English rightmost)
 * because the parent sets direction="rtl".  Verifies that no hard-coded
 * flexDirection: "row" breaks the RTL mirror.
 */
export const RTL: Story = {
  decorators: [
    (Story) => {
      i18n.changeLanguage("ps");
      return (
        <View style={{ padding: 24, backgroundColor: "#f8f8f8", direction: "rtl" }}>
          <Story />
        </View>
      );
    },
  ],
};
