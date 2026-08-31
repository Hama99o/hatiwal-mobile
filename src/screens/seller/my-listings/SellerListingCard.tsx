import React, { useRef, useState } from "react";
import { View, StyleSheet, Pressable, FlatList, useWindowDimensions } from "react-native";
import { RemoteImage } from "@/components/common/RemoteImage";
import type { ListingFeedViewMode } from "@/components/common/ListingFeed";
import Animated from "react-native-reanimated";
import { Eye, MessageCircle, Camera, MoreHorizontal } from "lucide-react-native";
import { usePulse } from "@/lib/animation";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { PriceTag } from "@/components/common/PriceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StockBadge } from "@/components/common/StockBadge";
import { ExpiryBadge } from "@/components/common/ExpiryBadge";
import { BuyerPickerSheet } from "@/components/common/BuyerPickerSheet";
import { ReviewPromptSheet } from "@/components/common/ReviewPromptSheet";
import { ListingActionsSheet } from "@/components/common/ListingActionsSheet";
import { type Listing } from "@/api/listings";
import { heldUnitsOf } from "@/utils/stock";
import { useListingLifecycle } from "@/hooks/useListingLifecycle";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

/** Animated shimmer shown behind each photo until it finishes loading.
 *  Uses usePulse() so the shimmer is skipped when Reduce Motion is enabled. */
function PhotoSkeleton({ width }: { width: number }) {
  const animStyle = usePulse();
  return (
    <Animated.View
      style={[animStyle, { position: "absolute", top: 0, left: 0, width, aspectRatio: 4 / 3 }]}
    />
  );
}

interface PhotoSlideProps {
  uri: string;
  width: number;
  bgColor: string;
}

function PhotoSlide({ uri, width, bgColor }: PhotoSlideProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <View style={{ width, aspectRatio: 4 / 3, backgroundColor: bgColor }}>
      {!loaded && <PhotoSkeleton width={width} />}
      <RemoteImage
        uri={uri}
        style={[styles.galleryImage, { width }]}
        transition={200}
        onLoad={() => setLoaded(true)}
      />
    </View>
  );
}

interface SellerListingCardProps {
  listing: Listing;
  /** Called after any successful mutation so the parent list can refresh immediately. */
  onMutated?: () => void;
  /**
   * Layout, mirroring the buyer-side ListingCard:
   *   'grid' — full-width photo carousel above the details.
   *   'list' — compact horizontal row, per DESIGN_SYSTEM.md §5. DEFAULT, because
   *            MyListings defaults its toggle to "list".
   *
   * Before this existed the toggle only changed the COLUMN COUNT, so "list" gave
   * one ~1100px-tall card per row: a seller with 11 listings scrolled 11 screens,
   * in the mode they land on by default.
   */
  viewMode?: ListingFeedViewMode;
}

export function SellerListingCard({ listing, onMutated, viewMode = "list" }: SellerListingCardProps) {
  const { t } = useTranslation();
  const { isRtl, formatNumber } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [moreVisible, setMoreVisible] = useState(false);

  const rowDirection = isRtl ? "row-reverse" : "row";
  const photos: string[] = listing.imageUrls?.length
    ? listing.imageUrls
    : listing.thumbnailUrl
    ? [listing.thumbnailUrl]
    : [];

  // useWindowDimensions, not Dimensions.get: this width is the photo carousel's
  // slide width AND its snap interval, so a stale value does not just mis-size the
  // photo — it desynchronises paging, leaving slides parked between photos. A
  // rotation does not re-run Dimensions.get unless something else re-renders.
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth - 32; // screen - horizontal padding

  // The compact row shows ONE photo at a fixed size instead of a pager: a 112dp
  // thumbnail cannot carry page dots legibly, and swiping a thumbnail that small
  // fights the vertical scroll of the list it sits in.
  const isList = viewMode === "list";
  const THUMB_W = 112;
  // Wider than any phone in portrait, so only tablets and landscape are clamped.
  const ACTION_ROW_MAX = 520;

  // TASK-L863: all seven lifecycle mutations, confirmAlert copy, invalidation
  // and BuyerPickerSheet/ReviewPromptSheet wiring live in this ONE hook —
  // shared with MyListingDetail so the two surfaces can never disagree again.
  const { primaryAction, moreActions, isBusy, buyerPicker, reviewPrompt } = useListingLifecycle({
    listingId: listing.id,
    listing,
    onDone: onMutated,
  });

  const handleOpenDetail = () => {
    router.push(`/(main)/my-listings/${listing.id}` as never);
  };

  const isExpired = !!listing.expired;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Photo gallery — tap card body to open owner detail screen */}
      <Pressable
        onPress={handleOpenDetail}
        accessibilityRole="button"
        accessibilityLabel={listing.title}
        // A handle for the card ITSELF, not its action buttons. Six flows opened
        // "the first listing" with a bare `tapOn: index: 0`, which has no selector
        // and matches every element on screen; the only other handle was the
        // listing's title, which is fixture data.
        testID="seller-listing-card">
        {/* One wrapper, two directions. The details block and the action row
            below are SHARED between both layouts — only the direction and the
            photo's size change, so there is no second copy of the card to keep
            in step with this one. */}
        <View style={{ flexDirection: isList ? rowDirection : "column" }}>
        {isList ? (
          // ── Compact leading thumbnail ──────────────────────────────────────
          <View style={{ width: THUMB_W, aspectRatio: 4 / 3, backgroundColor: colors.muted }}>
            {photos.length > 0 ? (
              <PhotoSlide uri={photos[0]} width={THUMB_W} bgColor={colors.muted} />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                <Camera size={18} color={colors.mutedForeground} />
                {/* Keep the words, not just the icon: a listing with no photo
                    cannot be published, so this is the one thing on the row a
                    seller must not have to infer from a small grey glyph. */}
                <Text
                  style={{ fontSize: 9, color: colors.mutedForeground, marginTop: 3, textAlign: "center" }}
                  numberOfLines={1}
                >
                  {t("listing.noPhoto")}
                </Text>
              </View>
            )}
            {/* A "+3" pip replaces the pager: the seller still learns there are
                more photos without a swipe target too small to hit. */}
            {photos.length > 1 && (
              <View
                style={{
                  position: "absolute", bottom: 4, right: 4,
                  backgroundColor: colors.darkScrim, borderRadius: 4,
                  paddingHorizontal: 5, paddingVertical: 1,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: colors.overlayForeground }}>
                  +{photos.length - 1}
                </Text>
              </View>
            )}
          </View>
        ) : photos.length > 0 ? (
          <View style={[styles.galleryWrapper, { backgroundColor: colors.muted }]}>
            <FlatList
              ref={flatListRef}
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, i) => `${item}-${i}`}
              getItemLayout={(_, index) => ({
                length: cardWidth,
                offset: cardWidth * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const slide = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
                setActiveSlide(slide);
              }}
              renderItem={({ item }) => (
                <PhotoSlide uri={item} width={cardWidth} bgColor={colors.muted} />
              )}
            />

            {/* Status badge — show "Expired" instead of "Active" when expired */}
            <View
              style={[
                styles.statusBadge,
                isRtl ? styles.statusBadgeRtl : styles.statusBadgeLtr,
              ]}
            >
              {isExpired ? (
                <View style={{ backgroundColor: colors.warning, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.warningForeground }}>
                    {t("listing.expiredBadge")}
                  </Text>
                </View>
              ) : (
                <StatusBadge status={listing.status} />
              )}
            </View>

            {/* Dot indicators — only shown when > 1 photo */}
            {photos.length > 1 && (
              <View style={styles.dotsRow}>
                {photos.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          i === activeSlide
                            ? colors.overlayForeground
                            : colors.overlayDotInactive,
                        width: i === activeSlide ? 8 : 6,
                        height: i === activeSlide ? 8 : 6,
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.noPhotoBox,
              { backgroundColor: colors.muted },
            ]}
          >
            <Camera size={28} color={colors.mutedForeground} />
            <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 6 }}>
              {t("listing.noPhoto")}
            </Text>
          </View>
        )}

        {/* Text info — SHARED by both layouts */}
        <View style={[styles.info, isList && styles.infoList]}>
          {/* In the grid the badge sits over the photo; a 112dp thumbnail cannot
              hold it, so in the row it leads the details instead. Either way the
              seller sees lifecycle state without opening anything. */}
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 8 }}>
            <PriceTag price={listing.price} currency={listing.currency} size="md" perUnit={listing.multiUnit === true} />
            {/* Remaining stock, right beside the price. This screen showed NO count at
                all, which is why a seller reported "the count did not change when I sell
                some in the list page" — there was nothing to change. The owner audience
                switches to "5 of 8 left" once a sale has happened, which is the progress
                a batch seller comes here to read. `heldBuyerName` gives a multi-unit
                hold the same "N held for Ahmad" clause the detail screen already has
                (docs/SELL_FLOW_REDESIGN.md §4.5's "detail/card view" wording) — the
                plain sale-line below is suppressed for exactly this case to avoid
                saying the same buyer's name twice on one card. */}
            <StockBadge
              listing={listing}
              audience="owner"
              heldBuyerName={listing.sale?.buyer?.name}
              testID="seller-card-stock"
            />
            {isList && (
              <View testID="seller-card-status">{isExpired ? (
              <View style={{ backgroundColor: colors.warning, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.warningForeground }}>
                  {t("listing.expiredBadge")}
                </Text>
              </View>
            ) : (
              <StatusBadge status={listing.status} />
            )}</View>
            )}
          </View>

          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: colors.foreground,
              textAlign: isRtl ? "right" : "left",
              marginTop: 4,
            }}
            numberOfLines={2}
          >
            {listing.title}
          </Text>

          {/* Proactive 30-day expiry countdown — sellers see it coming, not just after. */}
          <View style={{ marginTop: 6, alignItems: isRtl ? "flex-end" : "flex-start" }}>
            <ExpiryBadge
              expiresAt={listing.expiresAt}
              expired={listing.expired}
              status={listing.status}
            />
          </View>

          {/* TASK-R418: compact "Reserved for {name}" / "Sold to {name}" line —
              reserved/sold rows only, text-only (no second avatar stack on the
              card; the full buyer card with avatar lives on the owner detail
              screen). Renders nothing when there is no recorded buyer.
              CYCLE-4 design-review fix: `colors.warning` is tuned as a LABEL
              colour paired with `warningAlpha` background (see
              getStatusAccent) — used bare on the card's own background it
              reads at ~3.0:1, under the 4.5:1 AA floor. `foreground` (bold,
              for the still-actionable "reserved" state) / `mutedForeground`
              (dimmed, for the archived "sold" state) both meet AA in light
              and dark. CR fix (LOW): guard `sale.buyer?.name` the same way
              SaleBuyerCard does, instead of assuming it is always present.
              Suppressed for a multi-unit OPEN hold specifically: the
              `StockBadge` above already says "N held for {name}" (with the
              count this line lacks) — showing both would name the same
              buyer twice on one card. A single-item hold (no stock badge
              renders at all) and every `sold` row keep this line as their
              only buyer indicator. */}
          {listing.sale &&
            !(listing.multiUnit === true && listing.sale.status === "reserved" && heldUnitsOf(listing) > 0) && (
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: listing.sale.status === "sold" ? colors.mutedForeground : colors.foreground,
                marginTop: 6,
                textAlign: isRtl ? "right" : "left",
              }}
              numberOfLines={1}
              testID="seller-card-sale-line"
            >
              {listing.sale.status === "sold"
                ? t("listing.sale.soldTo", { name: listing.sale.buyer?.name || t("listing.sale.noBuyerRecorded") })
                : t("listing.sale.reservedFor", { name: listing.sale.buyer?.name || t("listing.sale.noBuyerRecorded") })}
            </Text>
          )}

          <View style={[styles.metaRow, { flexDirection: rowDirection }]}>
            <View style={[styles.metaItem, { flexDirection: rowDirection }]}>
              <Eye size={12} color={colors.mutedForeground} />
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                {/* `count` numeric for plural selection, `display` for the
                    localized digits — see A3/A12; passing the formatted string
                    as `count` is what made this read "1 views". */}
                {t("listing.viewsCount", {
                  count: listing.viewsCount ?? 0,
                  display: formatNumber(listing.viewsCount ?? 0),
                })}
              </Text>
            </View>
            {/* Only when there ARE chats. `!= null` let 0 through, so a listing
                nobody had messaged about rendered "0 chats" in ACCENT BLUE at
                weight 600 — the loudest element on the card — as a tap target
                leading to an empty screen. The views count beside it stays
                muted, so zero was shouting louder than a real number. */}
            {(listing.conversationsCount ?? 0) > 0 && (
              <Pressable
                onPress={() => router.push({
                  pathname: "/(main)/listing-conversations/[id]" as never,
                  params: { id: String(listing.id), listingTitle: listing.title },
                } as never)}
                hitSlop={8}
                style={[styles.metaItem, { flexDirection: rowDirection }]}
              >
                <MessageCircle size={12} color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>
                  {t("listing.conversationsCount", {
                    count: listing.conversationsCount,
                    display: formatNumber(listing.conversationsCount),
                  })}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
        </View>
      </Pressable>

      {/* TASK-L863: exactly two controls — the primary lifecycle button (or,
          on a terminal `sold` listing with no primary, More alone takes the
          full width) plus a compact "More" trigger for everything else. */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        {/* Cap the control row on a wide screen. Stretching to the full width of
            a landscape tablet gave a ~1750px "Publish" bar, and a sold listing —
            which has no primary action, so More takes flex:1 — became an enormous
            empty pill with a word in the middle. Verified from a 2560x1600
            screenshot. A button does not become more tappable by being wider than
            a hand; it just stops reading as a button.
            ACTION_ROW_MAX is generous enough to be unreachable on any phone, so
            phones keep the full-width layout they were designed with. */}
        <View
          style={{
            flexDirection: rowDirection,
            gap: 8,
            width: "100%",
            maxWidth: ACTION_ROW_MAX,
            alignSelf: isRtl ? "flex-end" : "flex-start",
          }}
        >
          {primaryAction && (
            <Button
              variant="default"
              size="sm"
              style={{ flex: 1 }}
              onPress={primaryAction.onPress}
              disabled={isBusy}
              testID="seller-card-primary-action"
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primaryForeground }}>
                {primaryAction.label}
              </Text>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            style={primaryAction ? styles.moreBtnCompact : { flex: 1 }}
            onPress={() => setMoreVisible(true)}
            disabled={isBusy}
            testID="seller-card-more-action"
          >
            <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 6 }}>
              <MoreHorizontal size={16} color={colors.foreground} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                {t("listing.actions.more")}
              </Text>
            </View>
          </Button>
        </View>
      </View>

      {/* TASK-L863: overflow sheet for every action besides the primary */}
      <ListingActionsSheet
        visible={moreVisible}
        onClose={() => setMoreVisible(false)}
        actions={moreActions}
        disabled={isBusy}
      />

      {/* TASK-TX01: buyer picker for Reserve / Mark-sold */}
      <BuyerPickerSheet
        visible={buyerPicker.visible}
        onClose={buyerPicker.onClose}
        listingId={listing.id}
        price={listing.price}
        currency={listing.currency}
        action={buyerPicker.action}
        remainingQuantity={buyerPicker.remainingQuantity}
        onConfirm={buyerPicker.onConfirm}
        isSubmitting={buyerPicker.isSubmitting}
      />

      {/* REV2: rate the buyer right after a sold sale records them */}
      <ReviewPromptSheet
        visible={reviewPrompt.visible}
        onClose={reviewPrompt.onClose}
        transactionId={reviewPrompt.transactionId}
        callerRole="seller"
        counterpartyName={reviewPrompt.buyerName}
        counterpartyAvatarUrl={reviewPrompt.buyerAvatarUrl}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  galleryWrapper: {
    width: "100%",
    aspectRatio: 4 / 3,
    position: "relative",
  },
  galleryImage: {
    aspectRatio: 4 / 3,
  },
  noPhotoBox: {
    width: "100%",
    aspectRatio: 4 / 3,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    position: "absolute",
    top: 10,
  },
  statusBadgeLtr: {
    left: 10,
  },
  statusBadgeRtl: {
    right: 10,
  },
  dotsRow: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    borderRadius: 99,
  },
  info: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  // Compact row: take the space beside the thumbnail, and lose the tall padding
  // that only makes sense under a full-width photo.
  infoList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  metaRow: {
    marginTop: 8,
    gap: 14,
    alignItems: "center",
  },
  metaItem: {
    alignItems: "center",
    gap: 4,
  },
  actions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "column",
    alignItems: "stretch",
    gap: 10,
  },
  moreBtnCompact: {
    minWidth: 92,
  },
});
