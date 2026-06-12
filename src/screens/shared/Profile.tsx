import { View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { authAPI } from "@/api/auth";
import { useAuthStore } from "@/stores/auth.store";
import { useModeStore } from "@/stores/mode.store";
import { useLocalization } from "@/hooks/useLocalization";
import { confirmAlert } from "@/utils/alert";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { isRtl, lang } = useLocalization();
  const router = useRouter();
  const clearUser = useAuthStore((s) => s.clearUser);
  const { mode, toggleMode } = useModeStore();

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
    setForm({ firstname: user.firstname ?? "", lastname: user.lastname ?? "", phone: user.phone ?? "", bio: user.bio ?? "", city: user.city ?? "" });
    setEditing(true);
  };

  const handleLogout = () => {
    confirmAlert(t("profile.logout"), t("profile.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: async () => {
          // Clear local session regardless of whether the backend call
          // succeeds — the user must always be able to sign out.
          try {
            await authAPI.logout();
          } catch {
            // ignore network/credential errors on sign-out
          }
          clearUser();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    textAlign: (isRtl ? "right" : "left") as "right" | "left",
    backgroundColor: "white",
  };

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{ backgroundColor: "white", padding: 24, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: "bold", color: "#2563EB" }}>
            {user?.firstname?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>{user?.fullName}</Text>
        <Text style={{ color: "#6b7280", marginTop: 4 }}>{user?.email}</Text>

        <TouchableOpacity
          onPress={toggleMode}
          style={{ marginTop: 12, flexDirection: "row", alignItems: "center", backgroundColor: mode === "seller" ? "#fef3c7" : "#dbeafe", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <Text style={{ fontWeight: "600", color: mode === "seller" ? "#92400e" : "#1e40af" }}>
            {mode === "seller" ? t("profile.switchToBuyer") : t("profile.switchToSeller")}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 16 }}>
        {editing ? (
          <View style={{ backgroundColor: "white", borderRadius: 12, padding: 16 }}>
            <TextInput placeholder={t("auth.firstName")} value={form.firstname} onChangeText={(v) => setForm((f) => ({ ...f, firstname: v }))} style={inputStyle} />
            <TextInput placeholder={t("auth.lastName")} value={form.lastname} onChangeText={(v) => setForm((f) => ({ ...f, lastname: v }))} style={inputStyle} />
            <TextInput placeholder={t("auth.phone")} value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" style={inputStyle} />
            <TextInput placeholder={t("profile.bio")} value={form.bio} onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))} multiline numberOfLines={3} style={[inputStyle, { height: 80 }]} />
            <TextInput placeholder={t("profile.city")} value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} style={inputStyle} />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <TouchableOpacity onPress={() => setEditing(false)} style={{ flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 12, alignItems: "center" }}>
                <Text>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => update.mutate(form)} disabled={update.isPending} style={{ flex: 1, backgroundColor: "#2563EB", borderRadius: 8, padding: 12, alignItems: "center" }}>
                <Text style={{ color: "white", fontWeight: "600" }}>{update.isPending ? t("common.loading") : t("common.save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: "white", borderRadius: 12, padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontWeight: "600", fontSize: 16 }}>{t("profile.info")}</Text>
              <TouchableOpacity onPress={startEdit}>
                <Text style={{ color: "#2563EB" }}>{t("common.edit")}</Text>
              </TouchableOpacity>
            </View>
            {user?.phone && <Text style={{ color: "#374151", marginBottom: 8 }}>{user.phone}</Text>}
            {user?.bio && <Text style={{ color: "#6b7280", marginBottom: 8 }}>{user.bio}</Text>}
            {user?.city && <Text style={{ color: "#6b7280" }}>{user.city}</Text>}
          </View>
        )}

        <TouchableOpacity
          onPress={handleLogout}
          style={{ marginTop: 24, borderWidth: 1, borderColor: "#fca5a5", borderRadius: 10, padding: 14, alignItems: "center" }}
        >
          <Text style={{ color: "#ef4444", fontWeight: "600" }}>{t("profile.logout")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
