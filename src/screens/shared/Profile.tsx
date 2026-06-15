import React, { useCallback } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
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
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { clearCachedPushToken } from "@/utils/push-token";
import { authAPI, type User } from "@/api/auth";
import { UserIdentity } from "@/components/common/UserIdentity";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useAuthStore } from "@/stores/auth.store";
import { useModeStore, resetMode } from "@/stores/mode.store";
import { useThemeStore, ThemePreference, resetTheme } from "@/stores/theme.store";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { confirmAlert } from "@/utils/alert";
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

function ProfileStatsGrid({ stats }: { stats: { label: string; value: string }[] }) {
  const colors = useColors();

  return (
    <SectionCard>
      <View style={{ flexDirection: "row", paddingVertical: 16 }}>
        {stats.map((stat, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              alignItems: "center",
              paddingHorizontal: 12,
              borderRightWidth: i < stats.length - 1 ? 1 : 0,
              borderRightColor: colors.border,
            }}
          >
            <Text className="text-xl font-bold" style={{ color: colors.primary, marginBottom: 4 }}>
              {stat.value}
            </Text>
            <Text className="text-xs" style={{ color: colors.mutedForeground, textAlign: "center" }}>
              {stat.label}
            </Text>
          </View>
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
              onPress={() => toast.info(t("common.comingSoon"))}
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

  const stats = isSeller
    ? [
        { label: t("profile.stats.sold"), value: String(user?.itemsSoldCount ?? 0) },
        { label: t("profile.stats.active"), value: String(user?.itemsActiveCount ?? 0) },
      ]
    : [
        { label: t("profile.itemsBought"), value: String(user?.itemsBoughtCount ?? 0) },
        { label: t("profile.itemsSaved"), value: String(user?.savedItemsCount ?? 0) },
      ];

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      <ProfileStatsGrid stats={stats} />
      <ProfileQuickActions user={user} isSeller={isSeller} />
      <PersonalInfoCard user={user} handleEdit={handleEdit} />
    </View>
  );
}

// ── Profile Loading Skeleton ───────────────────────────────────────────────────

function ProfileSkeleton() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Hero skeleton */}
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
      {/* Content skeleton */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
        <Skeleton style={{ width: "100%", height: 80, borderRadius: 16 }} />
        <Skeleton style={{ width: "100%", height: 120, borderRadius: 16 }} />
      </View>
    </View>
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

  // Refetch profile data every time the screen comes into focus so edits
  // and mode changes are reflected immediately on return.
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ["me"] });
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
    //   • status "denied"                         → block, show Settings CTA.
    //   No Platform.OS guard needed here — accessPrivileges is cross-platform (undefined
    //   on older OS versions, which means full access was granted the traditional way).
    if (permResult.status !== "granted") {
      confirmAlert(
        t("listing.form.permissionRequired"),
        t("listing.form.galleryPermission")
      );
      return;
    }
    if (permResult.accessPrivileges === "limited") {
      // Inform about partial access but continue — user can still pick their avatar
      // from the photos they already allowed.
      confirmAlert(
        t("listing.form.permissionRequired"),
        t("listing.form.galleryLimitedPermission")
      );
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
    <ScreenContainer scrollable padded={false}>
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
            borderColor: isSeller ? colors.warning : colors.primary,
            backgroundColor: isSeller ? colors.warningAlpha : colors.primaryAlpha,
            minHeight: 44,
          }}
        >
          {isSeller ? (
            <Store size={16} color={colors.warning} />
          ) : (
            <ShoppingBag size={16} color={colors.primary} />
          )}
          <Text className="text-sm font-semibold" style={{ color: isSeller ? colors.warning : colors.primary }}>
            {isSeller ? t("profile.switchToBuyer") : t("profile.switchToSeller")}
          </Text>
        </Button>
      </View>

      {/* ── Content — one unified layout; mode only changes stats + actions ── */}
      {user && <ProfileContent user={user} isSeller={isSeller} handleEdit={startEdit} />}

      {/* ── Settings (Appearance & Language) ────────────────────── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}>
        {/* Appearance */}
        <SectionCard>
          <SectionHeader title={t("profile.theme").toUpperCase()} />
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              padding: 12,
              gap: 8,
            }}
          >
            {THEME_OPTIONS.map(({ value, Icon, labelKey }) => {
              const isActive = theme === value;
              return (
                <Button
                  key={value}
                  variant={isActive ? "default" : "ghost"}
                  onPress={() => setTheme(value)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    flexDirection: "column",
                    paddingVertical: 14,
                    borderRadius: 12,
                    gap: 6,
                    borderWidth: 1.5,
                    borderColor: isActive ? colors.primary : colors.border,
                    backgroundColor: isActive ? colors.primaryAlpha : "transparent",
                    minHeight: 44,
                  }}
                >
                  <Icon
                    size={20}
                    color={isActive ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    className={isActive ? "text-xs font-bold" : "text-xs font-medium"}
                    style={{ color: isActive ? colors.primary : colors.mutedForeground }}
                  >
                    {t(labelKey)}
                  </Text>
                </Button>
              );
            })}
          </View>
        </SectionCard>

        {/* Language */}
        <SectionCard>
          <SectionHeader
            title={t("profile.language").toUpperCase()}
            icon={<Globe size={15} color={colors.mutedForeground} />}
          />
          <View style={{ paddingVertical: 4 }}>
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
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      backgroundColor: isActive ? colors.primaryAlpha : "transparent",
                      borderRadius: 0,
                      minHeight: 44,
                    }}
                  >
                    <Text
                      className={isActive ? "text-base font-semibold" : "text-base"}
                      style={{ color: isActive ? colors.primary : colors.foreground }}
                    >
                      {label}
                    </Text>
                    {isActive && <Check size={16} color={colors.primary} />}
                  </Button>
                  {!isLast && <Separator />}
                </React.Fragment>
              );
            })}
          </View>
        </SectionCard>

        {/* Privacy — blocked users management */}
        <SectionCard>
          <SectionHeader
            title={t("profile.privacy").toUpperCase()}
            icon={<ShieldOff size={15} color={colors.mutedForeground} />}
          />
          <Button
            variant="ghost"
            onPress={() => router.push("/(main)/blocked-users" as never)}
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 0,
              minHeight: 44,
            }}
          >
            <Text className="text-base" style={{ color: colors.foreground }}>
              {t("profile.blockedUsers")}
            </Text>
            {isRtl ? (
              <ChevronLeft size={18} color={colors.mutedForeground} />
            ) : (
              <ChevronRight size={18} color={colors.mutedForeground} />
            )}
          </Button>
        </SectionCard>

        {/* Sign Out — subdued ghost action, not a high-visibility destructive button */}
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
      </View>
    </ScreenContainer>
  );
}
