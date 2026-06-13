import { View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Sun, Moon, Smartphone, Globe, LogOut, Edit3, Check, ChevronRight, Store, ShoppingBag } from "lucide-react-native";
import { authAPI } from "@/api/auth";
import { useAuthStore } from "@/stores/auth.store";
import { useModeStore } from "@/stores/mode.store";
import { useThemeStore, ThemePreference } from "@/stores/theme.store";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { confirmAlert } from "@/utils/alert";
import { setLanguage, SUPPORTED_LANGUAGES, LanguageCode } from "@/i18n";

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

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const clearUser = useAuthStore((s) => s.clearUser);
  const { mode, toggleMode } = useModeStore();
  const { theme, setTheme } = useThemeStore();

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: authAPI.me,
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstname: "", lastname: "", phone: "", bio: "", city: "" });

  const update = useMutation({
    mutationFn: authAPI.updateMe,
    onSuccess: () => { setEditing(false); refetch(); },
    onError: () => confirmAlert(t("common.error")),
  });

  const startEdit = () => {
    if (!user) return;
    setForm({
      firstname: user.firstname ?? "",
      lastname: user.lastname ?? "",
      phone: user.phone ?? "",
      bio: user.bio ?? "",
      city: user.city ?? "",
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
          clearUser();
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

  const initials = user?.firstname?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?";
  const displayName = user?.fullName ?? user?.email ?? "";
  const isSeller = mode === "seller";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <View style={{ backgroundColor: colors.card, paddingTop: 32, paddingBottom: 24, paddingHorizontal: 24, alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {/* Avatar */}
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryAlpha, alignItems: "center", justifyContent: "center", marginBottom: 14, borderWidth: 2, borderColor: colors.primary }}>
          <Text style={{ fontSize: 30, fontWeight: "700", color: colors.primary }}>
            {initials}
          </Text>
        </View>

        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground, marginBottom: 3 }}>
          {displayName}
        </Text>
        <Text style={{ fontSize: 13, color: colors.mutedForeground, marginBottom: 20 }}>
          {user?.email}
        </Text>

        {/* Mode toggle */}
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

      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>

        {/* ── Personal Info ─────────────────────────────────────────── */}
        <SectionCard>
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: editing ? 1 : 0, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.mutedForeground }}>
              {t("profile.info").toUpperCase()}
            </Text>
            {!editing && (
              <TouchableOpacity onPress={startEdit} style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
                <Edit3 size={13} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "500" }}>{t("common.edit")}</Text>
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <View style={{ padding: 16 }}>
              <TextInput placeholder={t("auth.firstName")} placeholderTextColor={colors.mutedForeground} value={form.firstname} onChangeText={(v) => setForm((f) => ({ ...f, firstname: v }))} style={inputStyle} />
              <TextInput placeholder={t("auth.lastName")} placeholderTextColor={colors.mutedForeground} value={form.lastname} onChangeText={(v) => setForm((f) => ({ ...f, lastname: v }))} style={inputStyle} />
              <TextInput placeholder={t("auth.phone")} placeholderTextColor={colors.mutedForeground} value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" style={inputStyle} />
              <TextInput placeholder={t("profile.bio")} placeholderTextColor={colors.mutedForeground} value={form.bio} onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))} multiline numberOfLines={3} style={[inputStyle, { height: 90, textAlignVertical: "top" }]} />
              <TextInput placeholder={t("profile.city")} placeholderTextColor={colors.mutedForeground} value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} style={inputStyle} />
              <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 10, marginTop: 4 }}>
                <Button variant="outline" onPress={() => setEditing(false)} style={{ flex: 1 }}>
                  <Text>{t("common.cancel")}</Text>
                </Button>
                <Button onPress={() => update.mutate(form)} disabled={update.isPending} style={{ flex: 1 }}>
                  <Text>{update.isPending ? t("common.loading") : t("common.save")}</Text>
                </Button>
              </View>
            </View>
          ) : (
            <View style={{ padding: 16, gap: 8 }}>
              {user?.phone ? (
                <Text style={{ fontSize: 15, color: colors.foreground }}>{user.phone}</Text>
              ) : null}
              {user?.bio ? (
                <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 20 }}>{user.bio}</Text>
              ) : null}
              {user?.city ? (
                <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{user.city}</Text>
                </View>
              ) : null}
              {!user?.phone && !user?.bio && !user?.city && (
                <Text style={{ fontSize: 14, color: colors.mutedForeground }}>{t("profile.noInfo")}</Text>
              )}
            </View>
          )}
        </SectionCard>

        {/* ── Appearance ────────────────────────────────────────────── */}
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

        {/* ── Language ──────────────────────────────────────────────── */}
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

        {/* ── Sign Out ──────────────────────────────────────────────── */}
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
    </ScrollView>
  );
}
