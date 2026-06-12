import { View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Sun, Moon, Smartphone, Globe, LogOut, Edit3, Check } from "lucide-react-native";
import { authAPI } from "@/api/auth";
import { useAuthStore } from "@/stores/auth.store";
import { useModeStore } from "@/stores/mode.store";
import { useThemeStore, ThemePreference } from "@/stores/theme.store";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { confirmAlert } from "@/utils/alert";
import { setLanguage, SUPPORTED_LANGUAGES, LanguageCode } from "@/i18n";
import { Separator } from "@/components/reusables/separator";

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
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    color: colors.foreground,
    backgroundColor: colors.background,
    textAlign: (isRtl ? "right" : "left") as "right" | "left",
  };

  const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: t("profile.themeLight"), Icon: Sun },
    { value: "dark", label: t("profile.themeDark"), Icon: Moon },
    { value: "system", label: t("profile.themeSystem"), Icon: Smartphone },
  ];

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;

  const initials = user?.firstname?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ─── Avatar + Name + Mode toggle ─────────────────────────────── */}
      <View style={{ backgroundColor: colors.card, padding: 24, alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary + "22", alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 2, borderColor: colors.primary }}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.primary }}>
            {initials}
          </Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 2 }}>
          {user?.fullName ?? user?.email}
        </Text>
        <Text style={{ fontSize: 14, color: colors.mutedForeground, marginBottom: 16 }}>
          {user?.email}
        </Text>

        <TouchableOpacity
          onPress={toggleMode}
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            backgroundColor: mode === "seller" ? colors.warning + "22" : colors.primary + "18",
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: mode === "seller" ? colors.warning : colors.primary,
          }}
        >
          <Text style={{ fontWeight: "600", fontSize: 13, color: mode === "seller" ? colors.warning : colors.primary }}>
            {mode === "seller" ? t("profile.switchToBuyer") : t("profile.switchToSeller")}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        {/* ─── Personal Info ────────────────────────────────────────── */}
        <View style={{ backgroundColor: colors.card, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: editing ? 1 : 0, borderBottomColor: colors.border }}>
            <Text style={{ fontWeight: "600", fontSize: 16 }}>{t("profile.info")}</Text>
            {!editing && (
              <TouchableOpacity onPress={startEdit} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Edit3 size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13 }}>{t("common.edit")}</Text>
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <View style={{ padding: 16 }}>
              <TextInput placeholder={t("auth.firstName")} placeholderTextColor={colors.mutedForeground} value={form.firstname} onChangeText={(v) => setForm((f) => ({ ...f, firstname: v }))} style={inputStyle} />
              <TextInput placeholder={t("auth.lastName")} placeholderTextColor={colors.mutedForeground} value={form.lastname} onChangeText={(v) => setForm((f) => ({ ...f, lastname: v }))} style={inputStyle} />
              <TextInput placeholder={t("auth.phone")} placeholderTextColor={colors.mutedForeground} value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" style={inputStyle} />
              <TextInput placeholder={t("profile.bio")} placeholderTextColor={colors.mutedForeground} value={form.bio} onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))} multiline numberOfLines={3} style={[inputStyle, { height: 80 }]} />
              <TextInput placeholder={t("profile.city")} placeholderTextColor={colors.mutedForeground} value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} style={inputStyle} />

              <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 10, marginTop: 4 }}>
                <TouchableOpacity onPress={() => setEditing(false)} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, alignItems: "center" }}>
                  <Text style={{ color: colors.foreground }}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => update.mutate(form)} disabled={update.isPending} style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 8, padding: 12, alignItems: "center" }}>
                  <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>
                    {update.isPending ? t("common.loading") : t("common.save")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ padding: 16, gap: 6 }}>
              {user?.phone && <Text style={{ color: colors.foreground }}>{user.phone}</Text>}
              {user?.bio && <Text style={{ color: colors.mutedForeground }}>{user.bio}</Text>}
              {user?.city && <Text style={{ color: colors.mutedForeground }}>{user.city}</Text>}
              {!user?.phone && !user?.bio && !user?.city && (
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{t("profile.noInfo")}</Text>
              )}
            </View>
          )}
        </View>

        {/* ─── Theme ───────────────────────────────────────────────── */}
        <View style={{ backgroundColor: colors.card, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontWeight: "600", fontSize: 16 }}>{t("profile.theme")}</Text>
          </View>
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", padding: 12, gap: 8 }}>
            {THEME_OPTIONS.map(({ value, label, Icon }) => {
              const isActive = theme === value;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => setTheme(value)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 12,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: isActive ? colors.primary : colors.border,
                    backgroundColor: isActive ? colors.primary + "12" : "transparent",
                    gap: 6,
                  }}
                >
                  <Icon size={20} color={isActive ? colors.primary : colors.mutedForeground} />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: isActive ? colors.primary : colors.mutedForeground }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Language ─────────────────────────────────────────────── */}
        <View style={{ backgroundColor: colors.card, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
            <Globe size={18} color={colors.foreground} />
            <Text style={{ fontWeight: "600", fontSize: 16 }}>{t("profile.language")}</Text>
          </View>
          <View style={{ padding: 8, gap: 4 }}>
            {SUPPORTED_LANGUAGES.map(({ code, label }) => {
              const isActive = i18n.language === code;
              return (
                <TouchableOpacity
                  key={code}
                  onPress={() => setLanguage(code as LanguageCode)}
                  style={{
                    flexDirection: isRtl ? "row-reverse" : "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor: isActive ? colors.primary + "12" : "transparent",
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
        </View>

        {/* ─── Sign out ─────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 8,
            borderWidth: 1,
            borderColor: colors.destructive + "60",
            borderRadius: 10,
            padding: 14,
            backgroundColor: colors.destructive + "0C",
          }}
        >
          <LogOut size={16} color={colors.destructive} />
          <Text style={{ color: colors.destructive, fontWeight: "600", fontSize: 15 }}>
            {t("profile.logout")}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}
