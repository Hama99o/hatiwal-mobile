/**
 * EditProfile — full profile editing form.
 *
 * Sections:
 *   1. Identity   — first name, last name
 *   2. Contact    — phone, bio (Textarea)
 *   3. Location   — city, province + map pin picker
 *   4. Language   — preferred_language (en / ps / fa)
 *
 * Prefills from GET /users/me (via TanStack Query "me" cache or fresh fetch).
 * Saves via PUT /users/me with nested `user:` param.
 * Persists language change immediately via setLanguage() (updates i18n + backend).
 *
 * All UI from react-native-reusables. Colors via useColors(). RTL via isRtl.
 * Toast feedback via sonner-native. No raw Alert.alert.
 */
import React, { useCallback, useEffect } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Switch as RNSwitch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { toast } from "sonner-native";
import { MapPin, ChevronRight, ChevronLeft, User, Phone, Globe, Check, PlaneTakeoff } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { Textarea } from "@/components/reusables/textarea";
import { Button } from "@/components/reusables/button";
import { Label } from "@/components/reusables/label";
import { Separator } from "@/components/reusables/separator";

import { LocationRangePicker } from "@/components/common/LocationRangePicker";

import { authAPI } from "@/api/auth";
import { setLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

// ── Zod schema ────────────────────────────────────────────────────────────────

const schema = z.object({
  firstname: z.string().min(1, "firstnameRequired"),
  lastname: z.string().min(1, "lastnameRequired"),
  phone: z.string().max(20, "phoneTooLong").optional().or(z.literal("")),
  bio: z.string().max(500, "bioTooLong").optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  province: z.string().optional().or(z.literal("")),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  preferredLanguage: z.enum(["en", "ps", "fa"]),
  // Away mode — ISO date string (e.g. "2026-07-15") or null to clear
  awayUntilDate: z.string().optional().or(z.literal("")),
  isAwayToggle: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingBottom: 12,
        marginBottom: 4,
      }}
    >
      {icon}
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5 }}>
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

function FormSection({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 16,
      }}
    >
      {children}
    </View>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <View style={{ marginBottom: 14 }}>{children}</View>;
}

function ErrorText({ message }: { message?: string }) {
  const colors = useColors();
  if (!message) return null;
  return (
    <Text style={{ fontSize: 12, color: colors.destructive, marginTop: 4 }}>
      {message}
    </Text>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function EditProfileSkeleton() {
  const colors = useColors();
  const bar = (h: number, w: string | number = "100%") => (
    <View
      style={{
        height: h,
        width: w as any,
        backgroundColor: colors.muted,
        borderRadius: 8,
        marginBottom: 12,
      }}
    />
  );
  return (
    <View style={{ padding: 16 }}>
      {bar(44)}
      {bar(44)}
      {bar(44)}
      {bar(88)}
      {bar(44)}
      {bar(44)}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const { t, i18n } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [locationPickerVisible, setLocationPickerVisible] = React.useState(false);

  // Fetch current user data
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: authAPI.me,
  });

  // Refetch when screen gains focus
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ["me"] });
    }, [qc])
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstname: "",
      lastname: "",
      phone: "",
      bio: "",
      city: "",
      province: "",
      latitude: null,
      longitude: null,
      preferredLanguage: "en",
      awayUntilDate: "",
      isAwayToggle: false,
    },
  });

  // Prefill form when user data loads
  useEffect(() => {
    if (!user) return;
    // Backend serializes lat/long as decimal STRINGS ("34.500000"). The zod
    // schema requires z.number(), so a string here makes handleSubmit fail
    // validation silently (no visible error field) → Save appears to do nothing.
    // Coerce to real numbers (or null when absent/invalid).
    const toNum = (v: unknown): number | null => {
      if (v == null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    // Parse existing awayUntil — show date portion only (YYYY-MM-DD)
    const existingAwayDate = user.awayUntil
      ? user.awayUntil.substring(0, 10)
      : "";
    const isCurrentlyAway = !!user.isAway;

    reset({
      firstname: user.firstname ?? "",
      lastname: user.lastname ?? "",
      phone: user.phone ?? "",
      bio: user.bio ?? "",
      city: user.city ?? "",
      province: user.province ?? "",
      latitude: toNum(user.latitude),
      longitude: toNum(user.longitude),
      preferredLanguage: (user.preferredLanguage as LanguageCode) ?? "en",
      awayUntilDate: existingAwayDate,
      isAwayToggle: isCurrentlyAway,
    });
  }, [user, reset]);

  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const city = watch("city");
  const selectedLanguage = watch("preferredLanguage");
  const isAwayToggle = watch("isAwayToggle");
  const awayUntilDate = watch("awayUntilDate");

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      // Compute away_until: if toggle is on and a date is entered, build an ISO datetime
      // string set to end-of-day; if toggle is off, send null to clear.
      let awayUntil: string | null | undefined;
      if (values.isAwayToggle && values.awayUntilDate) {
        // Set to end of the chosen day (23:59:59 UTC+4:30 → simplified as T23:59:59Z)
        awayUntil = `${values.awayUntilDate}T23:59:59.000Z`;
      } else if (!values.isAwayToggle) {
        awayUntil = null; // explicit null clears the column
      }
      // If toggle is on but no date entered, omit awayUntil so we don't overwrite existing
      return authAPI.updateMe({
        firstname: values.firstname,
        lastname: values.lastname,
        phone: values.phone || undefined,
        bio: values.bio || undefined,
        city: values.city || undefined,
        province: values.province || undefined,
        latitude: values.latitude ?? undefined,
        longitude: values.longitude ?? undefined,
        preferredLanguage: values.preferredLanguage,
        ...(awayUntil !== undefined ? { awayUntil } : {}),
      });
    },
    onSuccess: async (updatedUser, values) => {
      // Persist language change immediately — updates i18n + AsyncStorage + backend
      if (values.preferredLanguage !== i18n.language) {
        await setLanguage(values.preferredLanguage as LanguageCode);
      }
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(t("profile.edit.saved"));
      // Navigate back to profile after a short delay so the toast is visible
      router.replace("/(main)/(tabs)/profile" as never);
    },
    onError: () => {
      toast.error(t("profile.edit.saveError"));
    },
  });

  const onSubmit = (values: FormValues) => {
    saveMutation.mutate(values);
  };

  // Surface validation failures — without this a blocked submit (e.g. a field
  // that doesn't match the schema) makes the Save button silently do nothing.
  const onInvalid = (formErrors: typeof errors) => {
    const first = Object.values(formErrors)[0] as { message?: string } | undefined;
    toast.error(errorMsg(first?.message) || t("profile.edit.saveError"));
  };

  // Resolve a validation error message key to a translated string
  const errorMsg = (key?: string) => {
    if (!key) return undefined;
    const msgKey = `profile.edit.validation.${key}`;
    const translated = t(msgKey);
    // Fall back to the raw key if the translation key is not found
    return translated !== msgKey ? translated : key;
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <EditProfileSkeleton />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Section 1: Identity ───────────────────────────────── */}
        <FormSection>
          <SectionHeader
            title={t("profile.edit.sections.identity")}
            icon={<User size={15} color={colors.mutedForeground} />}
          />

          <FieldRow>
            <Label style={{ marginBottom: 6 }}>
              {t("profile.edit.fields.firstname")}
            </Label>
            <Controller
              control={control}
              name="firstname"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t("profile.edit.fields.firstname")}
                  style={{
                    textAlign: isRtl ? "right" : "left",
                    borderColor: errors.firstname ? colors.destructive : colors.border,
                  }}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              )}
            />
            <ErrorText message={errorMsg(errors.firstname?.message)} />
          </FieldRow>

          <FieldRow>
            <Label style={{ marginBottom: 6 }}>
              {t("profile.edit.fields.lastname")}
            </Label>
            <Controller
              control={control}
              name="lastname"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t("profile.edit.fields.lastname")}
                  style={{
                    textAlign: isRtl ? "right" : "left",
                    borderColor: errors.lastname ? colors.destructive : colors.border,
                  }}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              )}
            />
            <ErrorText message={errorMsg(errors.lastname?.message)} />
          </FieldRow>
        </FormSection>

        {/* ── Section 2: Contact ────────────────────────────────── */}
        <FormSection>
          <SectionHeader
            title={t("profile.edit.sections.contact")}
            icon={<Phone size={15} color={colors.mutedForeground} />}
          />

          <FieldRow>
            <Label style={{ marginBottom: 6 }}>
              {t("profile.edit.fields.phone")}
            </Label>
            <Controller
              control={control}
              name="phone"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t("profile.edit.fields.phone")}
                  keyboardType="phone-pad"
                  style={{
                    textAlign: isRtl ? "right" : "left",
                    borderColor: errors.phone ? colors.destructive : colors.border,
                  }}
                  returnKeyType="next"
                />
              )}
            />
            <ErrorText message={errorMsg(errors.phone?.message)} />
          </FieldRow>

          <FieldRow>
            <Label style={{ marginBottom: 6 }}>
              {t("profile.edit.fields.bio")}
            </Label>
            <Controller
              control={control}
              name="bio"
              render={({ field: { value, onChange, onBlur } }) => (
                <Textarea
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t("profile.edit.fields.bioPlaceholder")}
                  style={{
                    textAlign: isRtl ? "right" : "left",
                    borderColor: errors.bio ? colors.destructive : colors.border,
                    minHeight: 100,
                  }}
                />
              )}
            />
            <ErrorText message={errorMsg(errors.bio?.message)} />
          </FieldRow>
        </FormSection>

        {/* ── Section 3: Location ───────────────────────────────── */}
        <FormSection>
          <SectionHeader
            title={t("profile.edit.sections.location")}
            icon={<MapPin size={15} color={colors.mutedForeground} />}
          />

          <FieldRow>
            <Label style={{ marginBottom: 6 }}>
              {t("profile.edit.fields.city")}
            </Label>
            <Controller
              control={control}
              name="city"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t("profile.edit.fields.city")}
                  style={{ textAlign: isRtl ? "right" : "left" }}
                  returnKeyType="next"
                />
              )}
            />
          </FieldRow>

          <FieldRow>
            <Label style={{ marginBottom: 6 }}>
              {t("profile.edit.fields.province")}
            </Label>
            <Controller
              control={control}
              name="province"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t("profile.edit.fields.province")}
                  style={{ textAlign: isRtl ? "right" : "left" }}
                  returnKeyType="done"
                />
              )}
            />
          </FieldRow>

          {/* Map pin picker row */}
          <Separator />
          <Pressable
            onPress={() => setLocationPickerVisible(true)}
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 10,
              borderWidth: 1,
              borderColor: latitude != null ? colors.primary : colors.border,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              marginTop: 12,
              backgroundColor: latitude != null ? colors.primaryAlpha : "transparent",
            }}
          >
            <MapPin size={18} color={latitude != null ? colors.primary : colors.mutedForeground} />
            <Text
              style={{
                flex: 1,
                fontSize: 14,
                color: latitude != null ? colors.foreground : colors.mutedForeground,
                textAlign: isRtl ? "right" : "left",
              }}
              numberOfLines={1}
            >
              {latitude != null
                ? city || t("profile.edit.fields.locationSet")
                : t("profile.edit.fields.setLocation")}
            </Text>
            {isRtl
              ? <ChevronLeft size={18} color={colors.mutedForeground} />
              : <ChevronRight size={18} color={colors.mutedForeground} />}
          </Pressable>
        </FormSection>

        {/* ── Section 4: Away Mode ─────────────────────────────── */}
        <FormSection>
          <SectionHeader
            title={t("profile.away.toggle")}
            icon={<PlaneTakeoff size={15} color={colors.mutedForeground} />}
          />

          {/* Toggle row */}
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 4,
              marginBottom: isAwayToggle ? 14 : 0,
            }}
          >
            <Text style={{ fontSize: 15, color: colors.foreground, flex: 1 }}>
              {t("profile.away.toggle")}
            </Text>
            <Controller
              control={control}
              name="isAwayToggle"
              render={({ field: { value, onChange } }) => (
                <RNSwitch
                  value={!!value}
                  onValueChange={(checked: boolean) => {
                    onChange(checked);
                    // When toggling off, clear the date field too
                    if (!checked) {
                      setValue("awayUntilDate", "", { shouldDirty: true });
                    }
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.primaryForeground}
                  ios_backgroundColor={colors.border}
                />
              )}
            />
          </View>

          {/* Date input — only shown when toggle is ON */}
          {!!isAwayToggle && (
            <FieldRow>
              <Label style={{ marginBottom: 6 }}>
                {t("profile.away.untilLabel")}
              </Label>
              <Controller
                control={control}
                name="awayUntilDate"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="YYYY-MM-DD"
                    keyboardType="numeric"
                    maxLength={10}
                    style={{
                      textAlign: isRtl ? "right" : "left",
                    }}
                  />
                )}
              />
              {/* Show current away date when already set */}
              {!!awayUntilDate && (
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>
                  {t("profile.away.untilLabel")}: {awayUntilDate}
                </Text>
              )}
            </FieldRow>
          )}
        </FormSection>

        {/* ── Section 5: Preferred Language ─────────────────────── */}
        <FormSection>
          <SectionHeader
            title={t("profile.edit.sections.language")}
            icon={<Globe size={15} color={colors.mutedForeground} />}
          />

          {SUPPORTED_LANGUAGES.map(({ code }, index) => {
            const isActive = selectedLanguage === code;
            const isLast = index === SUPPORTED_LANGUAGES.length - 1;
            const langLabel = t(`profile.edit.language.${code}`);
            return (
              <React.Fragment key={code}>
                <Pressable
                  onPress={() => setValue("preferredLanguage", code as LanguageCode, { shouldDirty: true })}
                  style={{
                    flexDirection: isRtl ? "row-reverse" : "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    paddingHorizontal: 4,
                    backgroundColor: isActive ? colors.primaryAlpha : "transparent",
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: isActive ? "600" : "400",
                      color: isActive ? colors.primary : colors.foreground,
                    }}
                  >
                    {langLabel}
                  </Text>
                  {isActive && <Check size={18} color={colors.primary} />}
                </Pressable>
                {!isLast && <Separator />}
              </React.Fragment>
            );
          })}
        </FormSection>

      </ScrollView>

      {/* ── Sticky Save Button ─────────────────────────────────── */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          // Clear the Android system nav bar — Math.max keeps the existing
          // 32pt minimum on devices with no bottom inset.
          paddingBottom: Math.max(insets.bottom, 32) + 12,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button
          onPress={handleSubmit(onSubmit, onInvalid)}
          disabled={saveMutation.isPending}
          size="lg"
          style={{ width: "100%" }}
        >
          {saveMutation.isPending ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color={colors.primaryForeground} />
              <Text>{t("profile.edit.saving")}</Text>
            </View>
          ) : (
            <Text>{t("profile.edit.saveButton")}</Text>
          )}
        </Button>
      </View>

      {/* ── Location Map Picker ────────────────────────────────── */}
      <LocationRangePicker
        visible={locationPickerVisible}
        mode="point"
        initialCoords={
          latitude != null && longitude != null
            ? { latitude, longitude }
            : null
        }
        initialRadius={5}
        initialLabel={city || null}
        onClose={() => setLocationPickerVisible(false)}
        onConfirm={({ coords, label }) => {
          setValue("latitude", coords.latitude, { shouldDirty: true });
          setValue("longitude", coords.longitude, { shouldDirty: true });
          if (label) setValue("city", label, { shouldDirty: true });
          setLocationPickerVisible(false);
        }}
      />
    </View>
  );
}
