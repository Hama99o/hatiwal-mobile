/**
 * PendingReviewsNudge — REV2 entry point (b): "Rate your recent deals" card
 * on the own Profile screen, driven by GET /my/reviews/pending. Renders
 * nothing when there is nothing to rate (no false-positive nudge).
 *
 * Each row is a sold Transaction the caller hasn't reviewed yet. `role`
 * tells which side the caller was — the counterparty to rate is the OTHER
 * side (role "seller" → rate the buyer; role "buyer" → rate the seller).
 */
import React, { useCallback, useState } from "react";
import { View, Pressable } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, ChevronRight } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { UserIdentity } from "@/components/common/UserIdentity";
import { ReviewPromptSheet } from "@/components/common/ReviewPromptSheet";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { reviewsAPI } from "@/api/reviews";
import type { Transaction } from "@/api/transactions";

const PENDING_QK = ["pending-reviews"];

function counterpartyOf(transaction: Transaction) {
  return transaction.role === "seller" ? transaction.buyer : transaction.seller;
}

export function PendingReviewsNudge() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const qc = useQueryClient();

  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null);

  const { data } = useQuery({
    queryKey: PENDING_QK,
    queryFn: () => reviewsAPI.getPendingReviews({ pageSize: 5 }),
  });

  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: PENDING_QK });
    }, [qc])
  );

  const pending: Transaction[] = data?.items ?? [];
  if (pending.length === 0) return null;

  const active = activeTransaction;
  const activeCounterparty = active ? counterpartyOf(active) : null;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }} testID="pending-reviews-nudge-wrapper">
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
        }}
        testID="pending-reviews-nudge"
      >
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 13,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Award size={16} color={colors.warning} />
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.foreground, letterSpacing: 0.3 }}
          >
            {t("reviews.pendingTitle")}
          </Text>
        </View>

        {pending.map((transaction) => {
          const counterparty = counterpartyOf(transaction);
          return (
            <Pressable
              key={transaction.id}
              onPress={() => setActiveTransaction(transaction)}
              testID={`pending-review-row-${transaction.id}`}
              android_ripple={{ color: colors.muted }}
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 8,
              }}
            >
              {/* flex: 1 so a long listing title ("Xiaomi Redmi Note 11 128GB")
                  shrinks the identity block instead of growing the row and
                  pushing the chevron out past the card's `overflow: "hidden"`
                  edge, where it was being clipped in half. */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <UserIdentity
                  name={counterparty.name}
                  avatarUrl={counterparty.avatarUrl}
                  size={36}
                  nameSize={14}
                  subtitle={transaction.listing?.title ?? undefined}
                />
              </View>
              <ChevronRight
                size={16}
                color={colors.mutedForeground}
                // Never let the affordance be the thing that gets squeezed out.
                style={[
                  { flexShrink: 0 },
                  isRtl ? { transform: [{ scaleX: -1 }] } : null,
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <ReviewPromptSheet
        visible={active !== null}
        onClose={() => setActiveTransaction(null)}
        transactionId={active?.id ?? 0}
        callerRole={active?.role === "buyer" ? "buyer" : "seller"}
        counterpartyName={activeCounterparty?.name ?? ""}
        counterpartyAvatarUrl={activeCounterparty?.avatarUrl ?? null}
        onSubmitted={() => qc.invalidateQueries({ queryKey: PENDING_QK })}
      />
    </View>
  );
}
