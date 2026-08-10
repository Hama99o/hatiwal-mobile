import React, { useCallback, useState } from "react";
import { View, Pressable, ActivityIndicator, Linking } from "react-native";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Separator } from "@/components/reusables/separator";
import { Skeleton } from "@/components/reusables/skeleton";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";
import { toast } from "sonner-native";
import {
  Sun,
  Moon,
  Smartphone,
  Globe,
  LogOut,
  Edit3,
  Check,
  Store,
  ShoppingBag,
  Camera,
  Plus,
  MessageCircle,
  Award,
  Heart,
  ShieldOff,
  ChevronRight,
  ChevronLeft,
  Flag,
  History,
  EyeOff,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { clearCachedPushToken } from "@/utils/push-token";
import { authAPI, type User } from "@/api/auth";
import { warningsAPI } from "@/api/warnings";
import { WarningBanner } from "@/components/common/WarningBanner";
import { AwayBanner } from "@/components/common/AwayBanner";
import { UserIdentity } from "@/components/common/UserIdentity";
import { UserAvatar } from "@/components/common/UserAvatar";
import { RatingDisplay } from "@/components/common/RatingDisplay";
import { PendingReviewsNudge } from "@/screens/shared/profile/PendingReviewsNudge";
import { useAuthStore } from "@/stores/auth.store";
import { useModeStore, resetMode } from "@/stores/mode.store";
import { useThemeStore, ThemePreference, resetTheme } from "@/stores/theme.store";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { confirmAlert } from "@/utils/alert";
import { showPermissionDeniedAlert, showLimitedPhotoAccessAlert } from "@/lib/permissions";
import { setLanguage, resetLanguage, SUPPORTED_LANGUAGES, LanguageCode } from "@/i18n";
import { ScreenContainer } from "@/components/ui/ScreenContainer";

// ── Constants ─────────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: ThemePreference; Icon: typeof Sun; labelKey: string }[] = [
  { value: "light", Icon: Sun, labelKey: "profile.themeLight" },
  { value: "dark", Icon: Moon, labelKey: "profile.themeDark" },
  { value: "system", Icon: Smartphone, labelKey: "profile.themeSystem" },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {children}
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      {icon}
      <Text className="text-sm font-semibold" style={{ color: colors.mutedForeground, letterSpacing: 0.3 }}>
        {title}
      </Text>
    </View>
  );
}

// ── Stats grid (shared by buyer + seller — same card, different stats) ──────────
// Exported so the grid-collapse regression (TASK-TX02 review fix) can be
// covered by a focused unit test without mounting the whole Profile screen.

// Review fix (TASK-TX02, LOW — "dead API surface"): the `columns` prop and
// its filler-slot padding used to exist for a hypothetical future 3/4-up
// grid, but this component has exactly ONE caller (ProfileContent below),
// which always passes a 1- or 2-entry `stats` array — `fillerCount` was
// therefore provably always 0 in production. Dropped the prop and the
// filler branch entirely; a lone stat's own `flex: 1` cell still centres
// itself across the full row for free (no filler needed to achieve that).
export function ProfileStatsGrid({
  stats,
}: {
  stats: { label: string; value: string }[];
}) {
  const colors = useColors();
  const { isRtl } = useLocalization();

  return (
    <SectionCard>
      <View style={{ flexDirection: isRtl ? "row-reverse" : "row", paddingVertical: 16 }}>
        {stats.map((stat, i) => (
          <React.Fragment key={i}>
            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 12 }}>
              <Text className="text-xl font-bold" style={{ color: colors.primary, marginBottom: 4 }}>
                {stat.value}
              </Text>
              <Text className="text-xs" style={{ color: colors.mutedForeground, textAlign: "center" }}>
                {stat.label}
              </Text>
            </View>
            {/* Review fix (CR MED — "borderRightWidth does not flip with
                row-reverse"): a physical `borderRightWidth` stays on the
                visual right regardless of layout direction, so under RTL
                (row-reverse) the divider landed on the wrong side of each
                cell. A dedicated 1px `View` sibling — same pattern as
                ProfileHeader.tsx's StatCell divider — is reordered by
                `flexDirection` along with everything else, so it always
                renders BETWEEN two cells in both LTR and RTL. */}
            {i < stats.length - 1 && (
              <View style={{ width: 1, backgroundColor: colors.border }} testID="profile-stats-divider" />
            )}
          </React.Fragment>
        ))}
      </View>
    </SectionCard>
  );
}

// ── Quick Action Card ──────────────────────────────────────────────────────────

function QuickActionCard({
  icon: Icon,
  label,
  onPress,
  badge,
  primary = false,
}: {
  icon: typeof Plus;
  label: string;
  onPress: () => void;
  badge?: number | string;
  primary?: boolean;
}) {
  const colors = useColors();
  // RTL fix: flip row direction and alignment so icon/label/badge mirror correctly
  const { isRtl } = useLocalization();

  return (
    <Button
      variant={primary ? "default" : "outline"}
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        justifyContent: isRtl ? "flex-end" : "flex-start",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        minHeight: 44,
      }}
    >
      <Icon
        size={18}
        color={primary ? colors.primaryForeground : colors.primary}
      />
      <Text className={primary ? "text-sm font-semibold" : "text-sm font-medium"} style={{ flex: 1 }}>
        {label}
      </Text>
      {!!badge && (
        <View
          style={{
            backgroundColor: colors.destructive,
            borderRadius: 12,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text className="text-xs font-semibold" style={{ color: colors.primaryForeground }}>
            {String(badge)}
          </Text>
        </View>
      )}
    </Button>
  );
}

// ── Personal Info (shared by both modes — identical layout) ────────────────────

function PersonalInfoCard({ user, handleEdit }: { user: User; handleEdit: () => void }) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();

  return (
    <SectionCard>
      <View
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 13,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text className="text-sm font-semibold" style={{ color: colors.mutedForeground }}>
          {t("profile.info").toUpperCase()}
        </Text>
        <Button
          variant="ghost"
          size="sm"
          onPress={handleEdit}
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 10,
            minHeight: 44,
          }}
        >
          <Edit3 size={14} color={colors.primary} />
          <Text className="text-sm font-medium" style={{ color: colors.primary }}>
            {t("common.edit")}
          </Text>
        </Button>
      </View>
      <View style={{ padding: 16, gap: 8 }}>
        {user?.phone ? (
          <Text className="text-base" style={{ color: colors.foreground }}>{user.phone}</Text>
        ) : null}
        {user?.bio ? (
          <Text className="text-sm" style={{ color: colors.mutedForeground, lineHeight: 20 }}>
            {user.bio}
          </Text>
        ) : null}
        {user?.city ? (
          <Text className="text-sm" style={{ color: colors.mutedForeground }}>{user.city}</Text>
        ) : null}
        {!user?.phone && !user?.bio && !user?.city && (
          <Text className="text-sm" style={{ color: colors.mutedForeground }}>
            {t("profile.noInfo")}
          </Text>
        )}
      </View>
    </SectionCard>
  );
}

// ── Quick Actions (shared card — only the action buttons differ by mode) ────────

function ProfileQuickActions({ user, isSeller }: { user: User; isSeller: boolean }) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const router = useRouter();

  return (
    <SectionCard>
      <View style={{ padding: 12, gap: 10 }}>
        {isSeller ? (
          <>
            <QuickActionCard
              icon={Plus}
              label={t("profile.quickActions.postNew")}
              onPress={() => router.push("/(main)/listing/new")}
              primary
            />
            <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 10 }}>
              <QuickActionCard
                icon={Store}
                label={`${t("profile.quickActions.myListings")} (${user?.itemsActiveCount ?? 0})`}
                onPress={() => router.push("/(main)/(tabs)/my-listings")}
              />
              <QuickActionCard
                icon={MessageCircle}
                label={t("profile.quickActions.messages")}
                onPress={() => router.push("/(main)/(tabs)/chat")}
                badge={user?.unreadMessageCount ?? 0}
              />
            </View>
            <QuickActionCard
              icon={Award}
              label={t("profile.quickActions.reviews")}
              onPress={() => router.push(`/(main)/user/${user.id}/reviews` as never)}
            />
          </>
        ) : (
          <>
            <QuickActionCard
              icon={ShoppingBag}
              label={t("profile.quickActions.browse")}
              onPress={() => router.push("/(main)/(tabs)/browse")}
            />
            <QuickActionCard
              icon={Heart}
              label={t("profile.quickActions.saved")}
              onPress={() => router.push("/(main)/(tabs)/saved")}
            />
            <QuickActionCard
              icon={MessageCircle}
              label={t("profile.quickActions.messages")}
              onPress={() => router.push("/(main)/(tabs)/chat")}
              badge={user?.unreadMessageCount ?? 0}
            />
            <QuickActionCard
              icon={Award}
              label={t("profile.quickActions.reviews")}
              onPress={() => router.push(`/(main)/user/${user.id}/reviews` as never)}
            />
          </>
        )}
      </View>
    </SectionCard>
  );
}

// ── Unified profile content — SAME structure for buyer & seller ────────────────
// One layout: stats grid → quick actions → personal info. Only the stat values
// and quick-action buttons change with mode; everything else is identical, so
// switching modes feels like the same profile with small tweaks (not two
// different screens).

function ProfileContent({
  user,
  isSeller,
  handleEdit,
}: {
  user: User;
  isSeller: boolean;
  handleEdit: () => void;
}) {
  const { t } = useTranslation();
  const { formatNumber } = useLocalization();

  // TASK-TX02 — Sold/Bought are sourced from the transactions table (a
  // completed sale with a confirmed counterparty), not items_sold_count
  // (listing.status == sold regardless of whether a buyer was ever
  // identified). Hidden entirely when 0 — Active/Saved always show.
  const soldCount = user?.soldCount ?? 0;
  const boughtCount = user?.boughtCount ?? 0;

  const stats = isSeller
    ? [
        ...(soldCount > 0
          ? [ { label: t("profile.stats.sold"), value: formatNumber(soldCount) } ]
          : []),
        { label: t("profile.stats.active"), value: formatNumber(user?.itemsActiveCount ?? 0) },
      ]
    : [
        ...(boughtCount > 0
          ? [ { label: t("profile.itemsBought"), value: formatNumber(boughtCount) } ]
          : []),
        { label: t("profile.itemsSaved"), value: formatNumber(user?.savedItemsCount ?? 0) },
      ];

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      {/* This grid is always Sold/Bought + Active/Saved (TASK-TX02). When the
          Sold/Bought stat is hidden (count is 0), `stats` drops to a single
          entry and ProfileStatsGrid centres it across the full row via its
          cell's own `flex: 1` — no filler slot needed. */}
      <ProfileStatsGrid stats={stats} />
      <ProfileQuickActions user={user} isSeller={isSeller} />
      <PersonalInfoCard user={user} handleEdit={handleEdit} />
    </View>
  );
}

// ── Profile Loading Skeleton ───────────────────────────────────────────────────

function ProfileSkeleton() {
  const colors = useColors();
  // Mirror the loaded screen's wrapper exactly (ScreenContainer scrollable,
  // padded={false}) so the safe-area top inset is applied and the hero/content
  // skeletons land in the SAME position as the real components — otherwise the
  // skeleton renders flush under the status bar, higher than the loaded layout.
  return (
    <ScreenContainer scrollable padded={false}>
      {/* Hero skeleton — matches the loaded hero header block */}
      <View
        style={{
          backgroundColor: colors.card,
          paddingTop: 32,
          paddingBottom: 24,
          paddingHorizontal: 24,
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 12,
        }}
      >
        <Skeleton
          style={{ width: 84, height: 84, borderRadius: 42 }}
        />
        <Skeleton style={{ width: 140, height: 20, borderRadius: 6 }} />
        <Skeleton style={{ width: 180, height: 14, borderRadius: 6 }} />
        <Skeleton style={{ width: 160, height: 36, borderRadius: 24 }} />
      </View>
      {/* Content skeleton — matches ProfileContent's padding */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
        <Skeleton style={{ width: "100%", height: 80, borderRadius: 16 }} />
        <Skeleton style={{ width: "100%", height: 120, borderRadius: 16 }} />
      </View>
    </ScreenContainer>
  );
}

// ── Main Profile Screen ────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { isRtl, formatDate } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const clearUser = useAuthStore((s) => s.clearUser);
  const { mode, toggleMode } = useModeStore();
  const { theme, setTheme } = useThemeStore();
  const qc = useQueryClient();

  const { data: user, isLoading, isError, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: authAPI.me,
  });

  // The user's own moderation warnings — drives the WarningBanner.
  const { data: warningsData } = useQuery({
    queryKey: ["warnings"],
    queryFn: warningsAPI.list,
  });

  // Refetch profile data every time the screen comes into focus so edits
  // and mode changes are reflected immediately on return.
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["warnings"] });
    }, [qc])
  );

  const avatarMutation = useMutation({
    mutationFn: authAPI.updateAvatar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
    onError: () => toast.error(t("common.error")),
  });

  const pickAvatar = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // Platform audit (2026-06-18):
    //   The "limited" access state (iOS 14+ "Select Photos" / Android API 34+) is NOT a
    //   separate PermissionStatus value — `status` stays "granted". It is surfaced via
    //   `accessPrivileges === "limited"` on MediaLibraryPermissionResponse.
    //   • "granted" + accessPrivileges "all"     → full library; proceed silently.
    //   • "granted" + accessPrivileges "limited"  → partial access; inform user, continue.
    //   • status "denied"                         → block, show Settings CTA (centralized
    //     helper — see src/lib/permissions.ts).
    //   No Platform.OS guard needed here — accessPrivileges is cross-platform (undefined
    //   on older OS versions, which means full access was granted the traditional way).
    if (permResult.status !== "granted") {
      showPermissionDeniedAlert("photos", t);
      return;
    }
    if (permResult.accessPrivileges === "limited") {
      // Inform about partial access but continue — user can still pick their avatar
      // from the photos they already allowed.
      showLimitedPhotoAccessAlert(t);
      // Intentionally fall through to launchImageLibraryAsync.
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      avatarMutation.mutate(result.assets[0].uri);
    }
  };

  const startEdit = () => router.push("/(main)/profile/edit" as never);

  const handleLogout = () => {
    confirmAlert(t("profile.logout"), t("profile.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: async () => {
          try {
            await authAPI.logout();
          } catch {}
          // Clear cached push token so the next login re-registers
          // in case the device token rotated while the user was logged out.
          await clearCachedPushToken();
          qc.clear();
          clearUser();
          await Promise.all([resetTheme(), resetMode(), resetLanguage()]);
          router.replace("/(main)/(tabs)/browse");
        },
      },
    ]);
  };

  // Permanent account deletion — required by App Store 5.1.1(v) & Google Play.
  // On confirm: delete server-side (cascades all owned data), then reset local
  // state exactly like logout and drop the user back to the guest feed.
  const handleDeleteAccount = () => {
    confirmAlert(t("profile.deleteAccountTitle"), t("profile.deleteAccountMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.deleteAccountConfirm"),
        style: "destructive",
        onPress: async () => {
          try {
            await authAPI.deleteAccount();
          } catch {
            toast.error(t("profile.deleteAccountError"));
            return; // account NOT deleted — stay signed in
          }
          await clearCachedPushToken();
          qc.clear();
          clearUser();
          await Promise.all([resetTheme(), resetMode(), resetLanguage()]);
          toast.success(t("profile.deleteAccountSuccess"));
          router.replace("/(main)/(tabs)/browse");
        },
      },
    ]);
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (isError) {
    return (
      <ScreenContainer scrollable={false} padded>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
          <Text className="text-base font-semibold" style={{ color: colors.foreground, textAlign: "center" }}>
            {t("common.errorTitle")}
          </Text>
          <Text className="text-sm" style={{ color: colors.mutedForeground, textAlign: "center" }}>
            {t("common.errorDescription")}
          </Text>
          <Button variant="default" onPress={() => refetch()} style={{ marginTop: 8 }}>
            <Text className="text-sm font-semibold">{t("common.retry")}</Text>
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  const displayName = user?.fullName ?? user?.email ?? "";
  const isSeller = mode === "seller";
  const memberSinceLabel = user?.createdAt
    ? t("profile.memberSince", { date: formatDate(user.createdAt) })
    : null;

  return (
    <ScreenContainer
      scrollable
      padded={false}
      onRefresh={() =>
        Promise.all([
          qc.invalidateQueries({ queryKey: ["me"] }),
          qc.invalidateQueries({ queryKey: ["warnings"] }),
        ])
      }
    >
      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: colors.card,
          paddingTop: 32,
          paddingBottom: 24,
          paddingHorizontal: 24,
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {/* Avatar section: UserAvatar in a Pressable (camera edit) with overlay badge.
            Name/verified/subtitle rendered by UserIdentity below (stacked, no avatar). */}
        <View style={{ marginBottom: 14, alignItems: "center" }}>
          {/* Pressable avatar — UserAvatar is the one permitted avatar implementation.
              hitSlop expands the 84px circle to at minimum a 44pt touch target on all sides. */}
          <Pressable
            onPress={pickAvatar}
            style={{ marginBottom: 10 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t("profile.editProfile")}
          >
            <View style={{ position: "relative" }}>
              <UserAvatar
                name={displayName}
                avatarUrl={user?.avatarUrl}
                size={84}
              />
              {/* Camera badge positioned at bottom-right of the 84px avatar circle.
                  The whole Pressable (84px circle + hitSlop) serves as the tap target,
                  so the badge itself doesn't need a separate hitSlop. */}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: colors.background,
                }}
              >
                {avatarMutation.isPending ? (
                  <ActivityIndicator size={12} color={colors.primaryForeground} />
                ) : (
                  <Camera size={14} color={colors.primaryForeground} />
                )}
              </View>
            </View>
          </Pressable>

          {/* Name row: verified badge + member-since subtitle via UserIdentity (stacked).
              showAvatar={false} cleanly suppresses the avatar without a size={0} hack. */}
          <UserIdentity
            name={displayName}
            avatarUrl={null}
            verified={user?.verified}
            subtitle={memberSinceLabel}
            showAvatar={false}
            nameSize={20}
            layout="stacked"
          />
          {/* REV2 — combined double-blind rating (seller + buyer roles) */}
          {user && (
            <View style={{ marginTop: 6 }}>
              <RatingDisplay
                avgRating={user.avgRating}
                reviewCount={user.reviewCount}
                onPress={() => router.push(`/(main)/user/${user.id}/reviews` as never)}
                testID="own-profile-rating"
              />
            </View>
          )}
        </View>

        {/* Mode Toggle — RNR Button outline variant */}
        <Button
          variant="outline"
          onPress={toggleMode}
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: isSeller ? colors.seller : colors.primary,
            backgroundColor: isSeller ? colors.sellerAlpha : colors.primaryAlpha,
            minHeight: 44,
          }}
        >
          {isSeller ? (
            <Store size={16} color={colors.seller} />
          ) : (
            <ShoppingBag size={16} color={colors.primary} />
          )}
          <Text className="text-sm font-semibold" style={{ color: isSeller ? colors.seller : colors.primary }}>
            {isSeller ? t("profile.switchToBuyer") : t("profile.switchToSeller")}
          </Text>
        </Button>
      </View>

      {/* ── Moderation warnings (only renders when the user has active strikes) ── */}
      {warningsData && warningsData.activeCount > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <WarningBanner
            activeCount={warningsData.activeCount}
            threshold={warningsData.threshold}
            warnings={warningsData.warnings.filter((w) => w.active)}
          />
        </View>
      )}

      {/* ── Away status row — shown to the seller on their own profile when away ── */}
      {user?.isAway && user?.awayUntil && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <AwayBanner
            awayUntil={user.awayUntil}
            messageKey="profile.away.youAreAway"
          />
        </View>
      )}

      {/* ── REV2 — "Rate your recent deals" nudge (renders nothing when empty) ── */}
      <PendingReviewsNudge />

      {/* ── Content — one unified layout; mode only changes stats + actions ── */}
      {user && <ProfileContent user={user} isSeller={isSeller} handleEdit={startEdit} />}

      {/* ── Settings ────────────────────────────────────────────── */}
      <SettingsSection
        isRtl={isRtl}
        colors={colors}
        t={t}
        i18n={i18n}
        theme={theme}
        setTheme={setTheme}
        handleLogout={handleLogout}
        handleDeleteAccount={handleDeleteAccount}
        router={router}
      />
    </ScreenContainer>
  );
}

// ── Settings Section ──────────────────────────────────────────────────────────
// Extracted to keep the main return clean. Receives only the values it needs.

function SettingsSection({
  isRtl,
  colors,
  t,
  i18n,
  theme,
  setTheme,
  handleLogout,
  handleDeleteAccount,
  router,
}: {
  isRtl: boolean;
  colors: ReturnType<typeof useColors>;
  t: (key: string) => string;
  i18n: { language: string };
  theme: ThemePreference;
  setTheme: (v: ThemePreference) => void;
  handleLogout: () => void;
  handleDeleteAccount: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [languageOpen, setLanguageOpen] = useState(false);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language);
  const currentLangLabel = currentLang?.label ?? i18n.language;

  const ChevronNav = isRtl ? ChevronLeft : ChevronRight;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}>

      {/* ── Preferences card: Appearance + Language in one compact card ── */}
      <SectionCard>
        {/* Appearance row — icon | label | [pill pill pill] */}
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 10,
            minHeight: 48,
          }}
        >
          <Sun size={16} color={colors.mutedForeground} style={{ marginEnd: 10 }} />
          <Text
            className="text-sm font-medium"
            style={{ color: colors.foreground, flex: 1 }}
          >
            {t("profile.theme")}
          </Text>
          {/* Three icon-only pill buttons inline on the right */}
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              gap: 4,
            }}
          >
            {THEME_OPTIONS.map(({ value, Icon }) => {
              const isActive = theme === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setTheme(value)}
                  android_ripple={{ color: colors.muted, borderless: false }}
                  accessibilityRole="button"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1.5,
                    borderColor: isActive ? colors.primary : colors.border,
                    backgroundColor: isActive ? colors.primaryAlpha : "transparent",
                  }}
                >
                  <Icon
                    size={16}
                    color={isActive ? colors.primary : colors.mutedForeground}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <Separator />

        {/* Language row — tappable, expands inline */}
        <Pressable
          onPress={() => setLanguageOpen((v) => !v)}
          android_ripple={{ color: colors.muted, borderless: false }}
          accessibilityRole="button"
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 10,
            minHeight: 48,
          }}
        >
          <Globe size={16} color={colors.mutedForeground} style={{ marginEnd: 10 }} />
          <Text
            className="text-sm font-medium"
            style={{ color: colors.foreground, flex: 1 }}
          >
            {t("profile.language")}
          </Text>
          <Text
            className="text-sm"
            style={{ color: colors.mutedForeground, marginEnd: 6 }}
          >
            {currentLangLabel}
          </Text>
          {languageOpen ? (
            <ChevronLeft
              size={16}
              color={colors.mutedForeground}
              style={{ transform: [{ rotate: isRtl ? "90deg" : "-90deg" }] }}
            />
          ) : (
            <ChevronNav size={16} color={colors.mutedForeground} />
          )}
        </Pressable>

        {/* Inline language picker — expands below the row */}
        {languageOpen && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingVertical: 4,
            }}
          >
            {SUPPORTED_LANGUAGES.map(({ code, label }, index) => {
              const isActive = i18n.language === code;
              const isLast = index === SUPPORTED_LANGUAGES.length - 1;
              return (
                <React.Fragment key={code}>
                  <Button
                    variant="ghost"
                    onPress={() => setLanguage(code as LanguageCode)}
                    style={{
                      flexDirection: isRtl ? "row-reverse" : "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 20,
                      paddingVertical: 11,
                      backgroundColor: isActive ? colors.primaryAlpha : "transparent",
                      borderRadius: 0,
                      minHeight: 44,
                    }}
                  >
                    <Text
                      className={isActive ? "text-sm font-semibold" : "text-sm"}
                      style={{ color: isActive ? colors.primary : colors.foreground }}
                    >
                      {label}
                    </Text>
                    {isActive && <Check size={15} color={colors.primary} />}
                  </Button>
                  {!isLast && <Separator />}
                </React.Fragment>
              );
            })}
          </View>
        )}
      </SectionCard>

      {/* ── Activity + Privacy combined card ─────────────────────── */}
      <SectionCard>
        {/* Activity sub-label */}
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 4,
          }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: colors.mutedForeground, letterSpacing: 0.4 }}
          >
            {t("profile.activity").toUpperCase()}
          </Text>
        </View>

        <Button
          variant="ghost"
          onPress={() => router.push("/(main)/recently-viewed" as never)}
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 0,
            minHeight: 44,
          }}
        >
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
            <History size={16} color={colors.mutedForeground} />
            <Text className="text-sm" style={{ color: colors.foreground }}>
              {t("profile.recentlyViewed")}
            </Text>
          </View>
          <ChevronNav size={16} color={colors.mutedForeground} />
        </Button>

        <Separator />

        <Button
          variant="ghost"
          onPress={() => router.push("/(main)/hidden-listings" as never)}
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 0,
            minHeight: 44,
          }}
        >
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
            <EyeOff size={16} color={colors.mutedForeground} />
            <Text className="text-sm" style={{ color: colors.foreground }}>
              {t("profile.hiddenListings")}
            </Text>
          </View>
          <ChevronNav size={16} color={colors.mutedForeground} />
        </Button>

        <Separator />

        {/* Privacy sub-label */}
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 4,
          }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: colors.mutedForeground, letterSpacing: 0.4 }}
          >
            {t("profile.privacy").toUpperCase()}
          </Text>
        </View>

        <Button
          variant="ghost"
          onPress={() => router.push("/(main)/blocked-users" as never)}
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 0,
            minHeight: 44,
          }}
        >
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
            <ShieldOff size={16} color={colors.mutedForeground} />
            <Text className="text-sm" style={{ color: colors.foreground }}>
              {t("profile.blockedUsers")}
            </Text>
          </View>
          <ChevronNav size={16} color={colors.mutedForeground} />
        </Button>

        <Separator />

        <Button
          variant="ghost"
          onPress={() => router.push("/(main)/profile/my-reports" as never)}
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 0,
            minHeight: 44,
          }}
        >
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
            <Flag size={16} color={colors.mutedForeground} />
            <Text className="text-sm" style={{ color: colors.foreground }}>
              {t("profile.myReports")}
            </Text>
          </View>
          <ChevronNav size={16} color={colors.mutedForeground} />
        </Button>

        <Separator />

        {/* Privacy Policy — row inside card (required for store review).
            Web base URL comes from env (EXPO_PUBLIC_WEB_URL — no hardcoded
            domain, house rule); row hides if the var is missing rather than
            pointing at a wrong host. */}
        {process.env.EXPO_PUBLIC_WEB_URL ? (
          <Pressable
            onPress={() =>
              Linking.openURL(
                `${process.env.EXPO_PUBLIC_WEB_URL}/${i18n.language}/privacy`
              )
            }
            accessibilityRole="link"
            accessibilityLabel={t("profile.privacyPolicy")}
            android_ripple={{ color: colors.muted, borderless: false }}
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              minHeight: 44,
              marginBottom: 4,
            }}
          >
            <Text
              className="text-sm"
              style={{
                flex: 1,
                color: colors.mutedForeground,
                textDecorationLine: "underline",
                textAlign: isRtl ? "right" : "left",
              }}
            >
              {t("profile.privacyPolicy")}
            </Text>
            <ChevronNav size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </SectionCard>

      {/* ── Sign Out — standalone subdued ghost row ───────────────── */}
      <Button
        variant="ghost"
        onPress={handleLogout}
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginTop: 4,
          marginBottom: 8,
          paddingVertical: 14,
          borderRadius: 12,
          minHeight: 44,
        }}
      >
        <LogOut size={18} color={colors.mutedForeground} />
        <Text className="text-base font-medium" style={{ color: colors.mutedForeground }}>
          {t("profile.logout")}
        </Text>
      </Button>

      {/* ── Delete Account — tiny, barely-visible link at the very bottom ── */}
      <Pressable
        onPress={handleDeleteAccount}
        accessibilityRole="button"
        accessibilityLabel={t("profile.deleteAccount")}
        android_ripple={{ color: colors.muted, borderless: true, radius: 80 }}
        style={{ alignItems: "center", paddingVertical: 12, marginTop: 4 }}
      >
        <Text
          style={{
            fontSize: 12,
            color: colors.mutedForeground,
            opacity: 0.6,
            textDecorationLine: "underline",
          }}
        >
          {t("profile.deleteAccount")}
        </Text>
      </Pressable>

    </View>
  );
}
