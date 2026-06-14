import { View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, Pressable } from "react-native";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Sun, Moon, Smartphone, Globe, LogOut, Edit3, Check, Store, ShoppingBag, Camera, Plus, MessageCircle, Award, Heart, MapPin, ChevronRight, ChevronLeft } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { authAPI } from "@/api/auth";
import { LocationRangePicker } from "@/components/common/LocationRangePicker";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useAuthStore } from "@/stores/auth.store";
import { useModeStore, resetMode } from "@/stores/mode.store";
import { useThemeStore, ThemePreference, resetTheme } from "@/stores/theme.store";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { confirmAlert } from "@/utils/alert";
import { setLanguage, resetLanguage, SUPPORTED_LANGUAGES, LanguageCode } from "@/i18n";

const THEME_OPTIONS: { value: ThemePreference; Icon: typeof Sun; labelKey: string }[] = [
  { value: "light", Icon: Sun, labelKey: "profile.themeLight" },
  { value: "dark",  Icon: Moon, labelKey: "profile.themeDark" },
  { value: "system", Icon: Smartphone, labelKey: "profile.themeSystem" },
];

function SectionCard({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: 12 }}>
      {children}
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      {icon}
      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.mutedForeground, letterSpacing: 0.3 }}>
        {title}
      </Text>
    </View>
  );
}

// ── Seller Dashboard Components ────────────────────────────────

function SellerStatsGrid({ user }: { user: any }) {
  const colors = useColors();
  const { t } = useTranslation();

  // Counts only — no money total (currencies can't be summed; see commit notes).
  const stats = [
    { label: t("profile.stats.sold"), value: String(user?.itemsSoldCount ?? 0) },
    { label: t("profile.stats.active"), value: String(user?.itemsActiveCount ?? 0) },
  ];

  return (
    <SectionCard>
      <View style={{ flexDirection: "row", paddingVertical: 16 }}>
        {stats.map((stat, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center", paddingHorizontal: 12, borderRightWidth: i < stats.length - 1 ? 1 : 0, borderRightColor: colors.border }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.primary, marginBottom: 4 }}>
              {stat.value}
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: "center" }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}

function QuickActionCard({ icon: Icon, label, onPress, badge }: { icon: typeof Plus; label: string; onPress: () => void; badge?: number | string }) {
  const colors = useColors();
  const isPrimary = label.includes("Post");

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: isPrimary ? colors.primary : colors.card,
        borderWidth: isPrimary ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <Icon size={18} color={isPrimary ? colors.primaryForeground : colors.primary} />
      <Text style={{ fontSize: 13, fontWeight: isPrimary ? "600" : "500", color: isPrimary ? colors.primaryForeground : colors.foreground, flex: 1 }}>
        {label}
      </Text>
      {badge && (
        <View style={{ backgroundColor: colors.destructive, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.primaryForeground }}>
            {badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ── Buyer Profile Content ──────────────────────────────────────

function BuyerProfileContent({ user, editing, handleEdit }: any) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();
  const router = useRouter();

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      {/* Purchase Activity */}
      <SectionCard>
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 8 }}>
            {t("profile.purchaseActivity")}
          </Text>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.primary }}>
                {user?.itemsBoughtCount ?? 0}
              </Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>
                {t("profile.itemsBought")}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.primary }}>
                {user?.savedItemsCount ?? 0}
              </Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>
                {t("profile.itemsSaved")}
              </Text>
            </View>
          </View>
        </View>
      </SectionCard>

      {/* Quick Actions - Buyer */}
      <SectionCard>
        <View style={{ padding: 12, gap: 10 }}>
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
        </View>
      </SectionCard>

      {/* Personal Info */}
      <SectionCard>
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: editing ? 1 : 0, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.mutedForeground }}>
            {t("profile.info").toUpperCase()}
          </Text>
          {!editing && (
            <TouchableOpacity onPress={handleEdit} style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
              <Edit3 size={13} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "500" }}>{t("common.edit")}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ padding: 16, gap: 8 }}>
          {user?.phone ? <Text style={{ fontSize: 15, color: colors.foreground }}>{user.phone}</Text> : null}
          {user?.bio ? <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 20 }}>{user.bio}</Text> : null}
          {user?.city ? <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{user.city}</Text> : null}
          {!user?.phone && !user?.bio && !user?.city && (
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{t("profile.noInfo")}</Text>
          )}
        </View>
      </SectionCard>
    </View>
  );
}

// ── Seller Dashboard Content ───────────────────────────────────

function SellerDashboardContent({ user, editing, handleEdit }: any) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();
  const router = useRouter();

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      {/* Sales Stats */}
      <SellerStatsGrid user={user} />

      {/* Quick Actions - Seller */}
      <SectionCard>
        <View style={{ padding: 12, gap: 10 }}>
          <QuickActionCard
            icon={Plus}
            label={t("profile.quickActions.postNew")}
            onPress={() => router.push("/(main)/listing/new")}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
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
            onPress={() => confirmAlert(t("common.comingSoon"))}
          />
        </View>
      </SectionCard>

      {/* Personal Info - Same for both */}
      <SectionCard>
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: editing ? 1 : 0, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.mutedForeground }}>
            {t("profile.info").toUpperCase()}
          </Text>
          {!editing && (
            <TouchableOpacity onPress={handleEdit} style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
              <Edit3 size={13} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "500" }}>{t("common.edit")}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ padding: 16, gap: 8 }}>
          {user?.phone ? <Text style={{ fontSize: 15, color: colors.foreground }}>{user.phone}</Text> : null}
          {user?.bio ? <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 20 }}>{user.bio}</Text> : null}
          {user?.city ? <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{user.city}</Text> : null}
          {!user?.phone && !user?.bio && !user?.city && (
            <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{t("profile.noInfo")}</Text>
          )}
        </View>
      </SectionCard>
    </View>
  );
}

// ── Main Profile Screen ────────────────────────────────────────

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const clearUser = useAuthStore((s) => s.clearUser);
  const { mode, toggleMode } = useModeStore();
  const { theme, setTheme } = useThemeStore();
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: authAPI.me,
  });

  const [editing, setEditing] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [form, setForm] = useState<{
    firstname: string;
    lastname: string;
    phone: string;
    bio: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
  }>({ firstname: "", lastname: "", phone: "", bio: "", city: "", latitude: null, longitude: null });

  const update = useMutation({
    mutationFn: authAPI.updateMe,
    onSuccess: () => { setEditing(false); qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: () => confirmAlert(t("common.error")),
  });

  const avatarMutation = useMutation({
    mutationFn: authAPI.updateAvatar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
    onError: () => confirmAlert(t("common.error")),
  });

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      confirmAlert(t("listing.form.permissionRequired"), t("listing.form.galleryPermission"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      avatarMutation.mutate(result.assets[0].uri);
    }
  };

  const startEdit = () => {
    if (!user) return;
    setForm({
      firstname: user.firstname ?? "",
      lastname: user.lastname ?? "",
      phone: user.phone ?? "",
      bio: user.bio ?? "",
      city: user.city ?? "",
      latitude: user.latitude ?? null,
      longitude: user.longitude ?? null,
    });
    setEditing(true);
  };

  const handleLogout = () => {
    confirmAlert(t("profile.logout"), t("profile.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: async () => {
          try { await authAPI.logout(); } catch {}
          qc.clear();
          clearUser();
          await Promise.all([resetTheme(), resetMode(), resetLanguage()]);
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 10,
    color: colors.foreground,
    backgroundColor: colors.background,
    fontSize: 15,
    textAlign: (isRtl ? "right" : "left") as "right" | "left",
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayName = user?.fullName ?? user?.email ?? "";
  const isSeller = mode === "seller";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <View style={{ backgroundColor: colors.card, paddingTop: 32, paddingBottom: 24, paddingHorizontal: 24, alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {/* Avatar — shared UserAvatar + an edit (camera) overlay */}
        <TouchableOpacity onPress={pickAvatar} style={{ marginBottom: 14 }} activeOpacity={0.8}>
          <UserAvatar name={displayName} avatarUrl={user?.avatarUrl} size={84} />
          <View style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.background }}>
            {avatarMutation.isPending
              ? <ActivityIndicator size={10} color={colors.primaryForeground} />
              : <Camera size={12} color={colors.primaryForeground} />}
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
            {displayName}
          </Text>
          {user?.verified && <VerifiedBadge size={18} />}
        </View>
        <Text style={{ fontSize: 13, color: colors.mutedForeground, marginBottom: 20 }}>
          {user?.email}
        </Text>

        {/* Mode Toggle */}
        <TouchableOpacity
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
          }}
        >
          {isSeller
            ? <Store size={16} color={colors.warning} />
            : <ShoppingBag size={16} color={colors.primary} />}
          <Text style={{ fontSize: 14, fontWeight: "600", color: isSeller ? colors.warning : colors.primary }}>
            {isSeller ? t("profile.switchToBuyer") : t("profile.switchToSeller")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Edit Mode ───────────────────────────────────────────────── */}
      {editing && user && (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <SectionCard>
            <View style={{ padding: 16 }}>
              <TextInput placeholder={t("auth.firstName")} placeholderTextColor={colors.mutedForeground} value={form.firstname} onChangeText={(v) => setForm((f) => ({ ...f, firstname: v }))} style={inputStyle} />
              <TextInput placeholder={t("auth.lastName")} placeholderTextColor={colors.mutedForeground} value={form.lastname} onChangeText={(v) => setForm((f) => ({ ...f, lastname: v }))} style={inputStyle} />
              <TextInput placeholder={t("auth.phone")} placeholderTextColor={colors.mutedForeground} value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" style={inputStyle} />
              <TextInput placeholder={t("profile.bio")} placeholderTextColor={colors.mutedForeground} value={form.bio} onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))} multiline numberOfLines={3} style={[inputStyle, { height: 90, textAlignVertical: "top" }]} />
              <TextInput placeholder={t("profile.city")} placeholderTextColor={colors.mutedForeground} value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} style={inputStyle} />

              {/* Location on map — search a place or drop an exact pin */}
              <TouchableOpacity
                onPress={() => setLocationPickerVisible(true)}
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 10,
                  borderWidth: 1,
                  borderColor: form.latitude != null ? colors.primary : colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  marginBottom: 12,
                }}
              >
                <MapPin size={18} color={form.latitude != null ? colors.primary : colors.mutedForeground} />
                <Text style={{ flex: 1, fontSize: 14, color: form.latitude != null ? colors.foreground : colors.mutedForeground, textAlign: isRtl ? "right" : "left" }} numberOfLines={1}>
                  {form.latitude != null ? (form.city || t("profile.locationSet")) : t("profile.setLocation")}
                </Text>
                {isRtl ? <ChevronLeft size={18} color={colors.mutedForeground} /> : <ChevronRight size={18} color={colors.mutedForeground} />}
              </TouchableOpacity>

              <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 10, marginTop: 4 }}>
                <Button variant="outline" onPress={() => setEditing(false)} style={{ flex: 1 }}>
                  <Text>{t("common.cancel")}</Text>
                </Button>
                <Button onPress={() => update.mutate(form)} disabled={update.isPending} style={{ flex: 1 }}>
                  <Text>{update.isPending ? t("common.loading") : t("common.save")}</Text>
                </Button>
              </View>
            </View>
          </SectionCard>
        </View>
      )}

      {/* ── Content (Seller Dashboard or Buyer Profile) ──────────── */}
      {!editing && user && (
        isSeller
          ? <SellerDashboardContent user={user} editing={editing} handleEdit={startEdit} />
          : <BuyerProfileContent user={user} editing={editing} handleEdit={startEdit} />
      )}

      {/* ── Settings (Appearance & Language) ────────────────────── */}
      {!editing && (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {/* Appearance */}
          <SectionCard>
            <SectionHeader title={t("profile.theme").toUpperCase()} />
            <View style={{ flexDirection: isRtl ? "row-reverse" : "row", padding: 12, gap: 8 }}>
              {THEME_OPTIONS.map(({ value, Icon, labelKey }) => {
                const isActive = theme === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setTheme(value)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: 14,
                      borderRadius: 12,
                      gap: 6,
                      borderWidth: 1.5,
                      borderColor: isActive ? colors.primary : colors.border,
                      backgroundColor: isActive ? colors.primaryAlpha : "transparent",
                    }}
                  >
                    <Icon size={20} color={isActive ? colors.primary : colors.mutedForeground} />
                    <Text style={{ fontSize: 12, fontWeight: isActive ? "700" : "500", color: isActive ? colors.primary : colors.mutedForeground }}>
                      {t(labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>

          {/* Language */}
          <SectionCard>
            <SectionHeader title={t("profile.language").toUpperCase()} icon={<Globe size={15} color={colors.mutedForeground} />} />
            <View style={{ paddingVertical: 4 }}>
              {SUPPORTED_LANGUAGES.map(({ code, label }, index) => {
                const isActive = i18n.language === code;
                const isLast = index === SUPPORTED_LANGUAGES.length - 1;
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => setLanguage(code as LanguageCode)}
                    style={{
                      flexDirection: isRtl ? "row-reverse" : "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: colors.border,
                      backgroundColor: isActive ? colors.primaryAlpha : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: isActive ? "600" : "400", color: isActive ? colors.primary : colors.foreground }}>
                      {label}
                    </Text>
                    {isActive && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>

          {/* Sign Out */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginTop: 4,
              marginBottom: 8,
              borderWidth: 1.5,
              borderColor: colors.destructive,
              borderRadius: 14,
              paddingVertical: 14,
              backgroundColor: colors.destructiveAlpha,
            }}
          >
            <LogOut size={18} color={colors.destructive} />
            <Text style={{ color: colors.destructive, fontWeight: "600", fontSize: 15 }}>
              {t("profile.logout")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Location picker (map) for profile editing */}
      <LocationRangePicker
        visible={locationPickerVisible}
        mode="point"
        initialCoords={form.latitude != null && form.longitude != null ? { latitude: form.latitude, longitude: form.longitude } : null}
        initialRadius={5}
        initialLabel={form.city || null}
        onClose={() => setLocationPickerVisible(false)}
        onConfirm={({ coords, label }) => {
          setForm((f) => ({
            ...f,
            latitude: coords.latitude,
            longitude: coords.longitude,
            city: label ?? f.city,
          }));
        }}
      />
    </ScrollView>
  );
}
