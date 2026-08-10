/**
 * ListingActionsSheet — the seller "More" bottom sheet for a listing's
 * lifecycle actions (TASK-L863).
 *
 * Every listing card / detail screen used to render up to six buttons
 * (Mark sold, Mark reserved, Unpublish, Activate, Edit, Duplicate, Delete)
 * inline, wrapping onto two-to-three rows. This sheet collapses everything
 * BESIDES the single primary action into one raw RN
 * <Modal transparent animationType="slide"> bottom sheet — the house
 * convention for sheets in this project (see ComposerActionsSheet.tsx /
 * BuyerPickerSheet.tsx; @gorhom/bottom-sheet isn't used here because its
 * native-only platform splits crash the web dev runner).
 *
 * This component is purely presentational — it renders whatever rows it's
 * given. `useListingLifecycle`'s `moreActions` is the canonical source of
 * those rows; this sheet owns no lifecycle logic itself.
 *
 * Destructive rows (`danger: true` — i.e. Delete) always render LAST, behind
 * a `Separator`, no matter where they appear in the input array.
 *
 * iOS BLACK-SCREEN GUARD (do not skip): every row calls `onClose()` FIRST and
 * THEN invokes its handler — opening BuyerPickerSheet / a confirmAlert while
 * this JS Modal is still mounted is the documented modal-conflict black
 * screen on iOS. Mirrors ComposerActionsSheet.tsx's `runAndClose` pattern.
 */
import React from "react";
import { Modal, View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Separator } from "@/components/reusables/separator";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

export interface ListingActionRow {
  key: string;
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  /** Destructive styling (red icon/text). Always rendered last, behind a separator. */
  danger?: boolean;
}

export interface ListingActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  actions: ListingActionRow[];
  /** True while a mutation is already in flight — dims and disables every row. */
  disabled?: boolean;
}

export function ListingActionsSheet({
  visible,
  onClose,
  actions,
  disabled = false,
}: ListingActionsSheetProps) {
  const colors = useColors();
  const { isRtl } = useLocalization();
  const insets = useSafeAreaInsets();

  // iOS BLACK-SCREEN GUARD: close this JS Modal BEFORE running the row's
  // handler (confirmAlert / BuyerPickerSheet) — see file header.
  const runAndClose = (handler: () => void) => {
    onClose();
    handler();
  };

  const normalActions = actions.filter((a) => !a.danger);
  const dangerActions = actions.filter((a) => a.danger);

  const renderRow = (action: ListingActionRow, isLast: boolean) => {
    const Icon = action.icon;
    const color = action.danger ? colors.destructive : colors.foreground;
    return (
      <Pressable
        key={action.key}
        onPress={() => runAndClose(action.onPress)}
        disabled={disabled}
        testID={`listing-action-${action.key}`}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        android_ripple={{ color: colors.muted }}
        style={[
          styles.row,
          {
            flexDirection: isRtl ? "row-reverse" : "row",
            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Icon size={20} color={color} />
        <Text
          style={{
            fontSize: 15,
            fontWeight: action.danger ? "600" : "500",
            color,
            marginStart: isRtl ? 0 : 14,
            marginEnd: isRtl ? 14 : 0,
          }}
        >
          {action.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.darkScrim }]}
        onPress={onClose}
        testID="listing-actions-backdrop"
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          },
        ]}
        testID="listing-actions-sheet"
      >
        {/* Drag handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
        </View>

        {normalActions.map((a, i) => renderRow(a, i === normalActions.length - 1 && dangerActions.length === 0))}

        {dangerActions.length > 0 && (
          <>
            <Separator />
            {dangerActions.map((a, i) => renderRow(a, i === dangerActions.length - 1))}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // backgroundColor applied inline via colors.darkScrim (useColors token)
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  handleRow: {
    alignItems: "center",
    marginBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  row: {
    alignItems: "center",
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
});
