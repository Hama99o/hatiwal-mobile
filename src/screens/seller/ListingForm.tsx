/**
 * ListingForm — Create (new) + Edit listing screen.
 *
 * Route params:
 *   new  → no params
 *   edit → { id: string }  (passed from navigation)
 *
 * Sections:
 *  1. Photos   — PhotosSection (expo-image-picker)
 *  2. Title    — required, ≤150 chars
 *  3. Price    — numeric + currency segmented (AFN / USD)
 *  4. Category — CategoryPickerSheet
 *  5. Description — optional Textarea
 *  6. Location — city text
 *
 * Submit: "Save draft" | "Publish now"
 * Uses react-hook-form + zod for validation.
 * sonner-native toasts for success/error feedback.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";

import { listingsAPI } from "@/api/listings";
import { Category } from "@/api/categories";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { Textarea } from "@/components/reusables/textarea";
import { Button } from "@/components/reusables/button";
import { Label } from "@/components/reusables/label";
import { Separator } from "@/components/reusables/separator";

import { PhotosSection, PhotoItem } from "./listing-form/PhotosSection";
import { CategoryPickerSheet } from "./listing-form/CategoryPickerSheet";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const listingSchema = z.object({
  title: z.string().min(1).max(150),
  // coerce handles both number and string inputs (API may return "500.0" as string)
  price: z.coerce.number().positive({ message: "Enter a valid price greater than 0" }),
  currency: z.enum(["AFN", "USD"]),
  // coerce handles categoryId coming back as string from some API responses
  categoryId: z.coerce.number().positive({ message: "Category is required" }),
  description: z.string().optional(),
  location: z.string().optional(),
});

type ListingFormValues = z.infer<typeof listingSchema>;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ListingFormScreen() {
  const { t, i18n } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const qc = useQueryClient();

  const isEdit = !!params.id;
  const listingId = isEdit ? Number(params.id) : null;

  // Photos state (managed outside react-hook-form because not a primitive field)
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isSubmittingPublish, setIsSubmittingPublish] = useState(false);

  // ---------------------------------------------------------------------------
  // Load existing listing in edit mode
  // ---------------------------------------------------------------------------
  const { data: existingListing } = useQuery({
    queryKey: ["my-listing", listingId],
    queryFn: () => listingsAPI.getMyListing(listingId!),
    enabled: isEdit && !!listingId,
  });

  // ---------------------------------------------------------------------------
  // react-hook-form
  // ---------------------------------------------------------------------------
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      currency: "AFN",
    },
  });

  const currency = watch("currency");

  // Prefill form in edit mode once data is loaded
  useEffect(() => {
    if (existingListing && isEdit) {
      reset({
        title: existingListing.title,
        price: Number(existingListing.price),
        currency: existingListing.currency,
        categoryId: Number(existingListing.categoryId),
        description: existingListing.description ?? "",
        location: existingListing.location ?? "",
      });
      // Pre-fill the category picker display from the embedded category object
      if (existingListing.category) {
        setSelectedCategory(existingListing.category as any);
      }
      if (existingListing.images) {
        setPhotos(existingListing.images.map((uri) => ({ uri, isRemote: true })));
      }
    }
  }, [existingListing, isEdit, reset]);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const saveMutation = useMutation({
    mutationFn: async (values: ListingFormValues) => {
      const imageUris = photos.filter((p) => !p.isRemote).map((p) => p.uri);
      // remote photos are already on the server; only upload new local ones
      if (isEdit && listingId) {
        return listingsAPI.updateListingWithImages(listingId, values, imageUris);
      }
      return listingsAPI.createListingWithImages(values, imageUris);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success(t("listing.form.savedDraft"));
      router.replace("/(main)/(tabs)/my-listings" as never);
    },
    onError: () => {
      toast.error(t("listing.form.saveError"));
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (values: ListingFormValues) => {
      const imageUris = photos.filter((p) => !p.isRemote).map((p) => p.uri);
      let listing;
      if (isEdit && listingId) {
        listing = await listingsAPI.updateListingWithImages(listingId, values, imageUris);
      } else {
        listing = await listingsAPI.createListingWithImages(values, imageUris);
      }
      // Only publish if the listing is still a draft — already-active listings
      // cannot be published again (backend policy: publish? = owner? && draft?)
      if (listing.status === "draft") {
        return listingsAPI.publishListing(listing.id);
      }
      return listing;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success(t("listing.form.published"));
      router.replace("/(main)/(tabs)/my-listings" as never);
    },
    onError: () => {
      toast.error(t("listing.form.publishError"));
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const onSaveDraft = handleSubmit((values) => {
    setIsSubmittingPublish(false);
    saveMutation.mutate(values);
  });

  const onPublish = handleSubmit((values) => {
    setIsSubmittingPublish(true);
    publishMutation.mutate(values);
  });

  const isLoading = saveMutation.isPending || publishMutation.isPending;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Screen title */}
        <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 24 }}>
          {isEdit ? t("listing.edit") : t("listing.create")}
        </Text>

        {/* ------------------------------------------------------------------ */}
        {/* 1. Photos                                                           */}
        {/* ------------------------------------------------------------------ */}
        <PhotosSection photos={photos} onChange={setPhotos} />

        <Separator className="my-6" />

        {/* ------------------------------------------------------------------ */}
        {/* 2. Title                                                            */}
        {/* ------------------------------------------------------------------ */}
        <View style={styles.field}>
          <Label nativeID="title-label" className="mb-1">
            {t("listing.title")}
            <Text style={{ color: colors.destructive }}> *</Text>
          </Label>
          <Controller
            control={control}
            name="title"
            render={({ field }) => (
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={t("listing.titlePlaceholder")}
                maxLength={150}
                style={{ textAlign: isRtl ? "right" : "left" }}
                aria-labelledby="title-label"
              />
            )}
          />
          {errors.title && (
            <Text style={{ fontSize: 12, color: colors.destructive, marginTop: 4 }}>
              {t("listing.form.titleRequired")}
            </Text>
          )}
          <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: "right", marginTop: 4 }}>
            {`${watch("title")?.length ?? 0}/150`}
          </Text>
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* 3. Price + Currency                                                 */}
        {/* ------------------------------------------------------------------ */}
        <View style={styles.field}>
          <Label className="mb-1">
            {t("common.price")}
            <Text className="text-destructive"> *</Text>
          </Label>
          <View style={[styles.priceRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <Controller
              control={control}
              name="price"
              render={({ field }) => (
                <Input
                  value={field.value ? String(field.value) : ""}
                  onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}
                  onBlur={field.onBlur}
                  placeholder={t("listing.pricePlaceholder")}
                  keyboardType="numeric"
                  style={[styles.priceInput, { textAlign: isRtl ? "right" : "left" }]}
                />
              )}
            />
            {/* Currency segmented */}
            <View style={[styles.currencyRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
              {(["AFN", "USD"] as const).map((curr) => (
                <Pressable
                  key={curr}
                  onPress={() => setValue("currency", curr)}
                  style={[
                    styles.currencyBtn,
                    {
                      backgroundColor: currency === curr ? colors.primary : colors.muted,
                      borderColor: currency === curr ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: currency === curr ? colors.primaryForeground : colors.mutedForeground }}
                  >
                    {curr}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {errors.price && (
            <Text style={{ fontSize: 12, color: colors.destructive, marginTop: 4 }}>
              {t("listing.form.priceRequired")}
            </Text>
          )}
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* 4. Category                                                         */}
        {/* ------------------------------------------------------------------ */}
        <View style={styles.field}>
          <Label className="mb-1">
            {t("common.category")}
            <Text className="text-destructive"> *</Text>
          </Label>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Pressable
                style={[
                  styles.categoryBtn,
                  {
                    borderColor: errors.categoryId ? colors.destructive : colors.border,
                    backgroundColor: colors.card,
                  },
                ]}
                onPress={() => setCategoryPickerVisible(true)}
              >
                <Text
                  style={{ fontSize: 14, color: selectedCategory ? colors.foreground : colors.mutedForeground, textAlign: isRtl ? "right" : "left" }}
                >
                  {selectedCategory
                    ? getLocalizedCategoryName(selectedCategory, i18n.language)
                    : t("listing.form.selectCategoryPlaceholder")}
                </Text>
              </Pressable>
            )}
          />
          {errors.categoryId && (
            <Text style={{ fontSize: 12, color: colors.destructive, marginTop: 4 }}>
              {t("listing.form.categoryRequired")}
            </Text>
          )}
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* 5. Description                                                      */}
        {/* ------------------------------------------------------------------ */}
        <View style={styles.field}>
          <Label className="mb-1">{t("common.description")}</Label>
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <Textarea
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={t("listing.descriptionPlaceholder")}
                numberOfLines={4}
                style={{ textAlign: isRtl ? "right" : "left", textAlignVertical: "top" }}
              />
            )}
          />
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* 6. Location                                                         */}
        {/* ------------------------------------------------------------------ */}
        <View style={[styles.field, { marginBottom: 120 }]}>
          <Label className="mb-1">{t("common.location")}</Label>
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={t("listing.locationPlaceholder")}
                style={{ textAlign: isRtl ? "right" : "left" }}
              />
            )}
          />
        </View>
      </ScrollView>

      {/* -------------------------------------------------------------------- */}
      {/* Sticky submit bar                                                     */}
      {/* -------------------------------------------------------------------- */}
      <View
        style={[
          styles.submitBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            flexDirection: isRtl ? "row-reverse" : "row",
          },
        ]}
      >
        <Button
          variant="outline"
          onPress={onSaveDraft}
          disabled={isLoading}
          style={styles.submitBtn}
        >
          <Text>{t("listing.form.saveDraft")}</Text>
        </Button>
        <Button
          variant="default"
          onPress={onPublish}
          disabled={isLoading}
          style={styles.submitBtn}
        >
          <Text>{isLoading && isSubmittingPublish ? t("common.loading") : t("listing.publish")}</Text>
        </Button>
      </View>

      {/* -------------------------------------------------------------------- */}
      {/* Category picker sheet                                                 */}
      {/* -------------------------------------------------------------------- */}
      <CategoryPickerSheet
        visible={categoryPickerVisible}
        selectedId={selectedCategory?.id ?? null}
        onSelect={(cat) => {
          setSelectedCategory(cat);
          setValue("categoryId", cat.id, { shouldValidate: true });
          setCategoryPickerVisible(false);
        }}
        onClose={() => setCategoryPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

function getLocalizedCategoryName(cat: Category, lang: string): string {
  if (lang === "ps") return cat.namePs;
  if (lang === "fa") return cat.nameFa;
  return cat.nameEn;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  field: {
    marginBottom: 20,
  },
  priceRow: {
    gap: 8,
    alignItems: "center",
  },
  priceInput: {
    flex: 1,
  },
  currencyRow: {
    gap: 4,
  },
  currencyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 52,
    alignItems: "center",
  },
  categoryBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  submitBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  submitBtn: {
    flex: 1,
  },
});
