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
 *  3. Price    — numeric + currency picker (AFN / USD / EUR)
 *  4. Category — CategoryPicker (shared: @/components/common/CategoryPicker)
 *  5. Description — optional Textarea
 *  6. Location — exact point on the map (search a place or drop a pin)
 *  7. Address — free-text meeting point (street, landmark)
 *
 * Submit: "Save draft" | "Publish now"
 * Uses react-hook-form + zod for validation.
 * sonner-native toasts for success/error feedback.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Pressable,
} from "react-native";
import { ChevronRight, MapPin, Coins, Check, ToggleRight, Copy } from "lucide-react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useCategoryName } from "@/hooks/useCategoryName";
import { toast } from "sonner-native";

import { confirmAlert } from "@/utils/alert";
import { listingsAPI } from "@/api/listings";
import { Category } from "@/api/categories";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { Textarea } from "@/components/reusables/textarea";
import { Label } from "@/components/reusables/label";
import { Separator } from "@/components/reusables/separator";
import { Switch } from "@/components/reusables/switch";

import { PhotosSection, PhotoItem } from "./listing-form/PhotosSection";
import { CategoryPicker } from "@/components/common/CategoryPicker";
import { ConditionChips } from "@/components/common/ConditionChips";
import { LocationRangePicker } from "@/components/common/LocationRangePicker";
import { BackButton } from "@/components/common/BackButton";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const listingSchema = z.object({
  title: z.string().min(1).max(150),
  // coerce handles both number and string inputs (API may return "500.0" as string)
  price: z.coerce.number().positive({ message: "Enter a valid price greater than 0" }),
  currency: z.enum(["AFN", "USD", "EUR"]),
  // Optional — sellers may leave it unset; mirrors the backend enum values.
  condition: z.enum(["brand_new", "like_new", "good", "fair"]).optional(),
  // coerce handles categoryId coming back as string from some API responses
  categoryId: z.coerce.number().positive({ message: "Category is required" }),
  description: z.string().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  // Coordinates are required — used for distance-based filtering.
  // coerce: the API returns decimal columns as strings (e.g. "48.947681"), same as price/categoryId.
  // finite() rejects undefined→NaN and Infinity, making these effectively required.
  latitude: z.coerce.number().finite(),
  longitude: z.coerce.number().finite(),
  // negotiable: whether the seller accepts price offers. Default: true.
  negotiable: z.boolean().default(true),
});

type ListingFormValues = z.infer<typeof listingSchema>;

// Local autosave of an in-progress NEW listing (text fields only — not photos,
// whose local URIs may not survive an app restart). Restored on next open.
const DRAFT_KEY = "hatiwal:listing-draft";
interface DraftSnapshot {
  values: Partial<ListingFormValues>;
  mapLabel: string | null;
  category: Category | null;
  savedAt: number;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ListingFormScreen() {
  const { t } = useTranslation();
  const categoryName = useCategoryName();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; duplicateFrom?: string }>();
  const qc = useQueryClient();

  const isEdit = !!params.id;
  const listingId = isEdit ? Number(params.id) : null;

  // Duplicate / relist — opens this same create form prefilled from an
  // existing listing's text fields as a fresh DRAFT (photos are never
  // copied — Active Storage blobs can't be cloned client-side).
  const isDuplicate = !isEdit && !!params.duplicateFrom;
  const duplicateFromId = isDuplicate ? Number(params.duplicateFrom) : null;
  const [duplicateNoticeVisible, setDuplicateNoticeVisible] = useState(false);

  // Photos state (managed outside react-hook-form because not a primitive field)
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [mapLabel, setMapLabel] = useState<string | null>(null);
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
  // Load the source listing to duplicate (text fields only — see below)
  // ---------------------------------------------------------------------------
  const { data: duplicateSource, isError: isDuplicateSourceError } = useQuery({
    queryKey: ["my-listing", duplicateFromId],
    queryFn: () => listingsAPI.getMyListing(duplicateFromId!),
    enabled: isDuplicate && !!duplicateFromId,
    retry: false,
  });

  // Refetch the listing every time the edit form comes into focus so the
  // user always sees the latest data (not a stale cache from a previous visit).
  useFocusEffect(
    useCallback(() => {
      if (isEdit && listingId) {
        qc.invalidateQueries({ queryKey: ["my-listing", listingId] });
      }
    }, [isEdit, listingId, qc])
  );

  // ---------------------------------------------------------------------------
  // react-hook-form
  // ---------------------------------------------------------------------------
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      currency: "AFN",
      negotiable: true,
    },
  });

  // Draft autosave (new listings only) — so a half-written post survives leaving the screen.
  const [restorableDraft, setRestorableDraft] = useState<DraftSnapshot | null>(null);

  const currency = watch("currency");
  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const hasExactLocation = latitude != null && longitude != null;
  // A published listing (active/reserved/sold) can't be "saved as draft" — only
  // edited in place. Use Unpublish (on My Listings) to take it offline.
  const isPublished = isEdit && !!existingListing && existingListing.status !== "draft";

  // Prefill form in edit mode once data is loaded
  useEffect(() => {
    if (existingListing && isEdit) {
      reset({
        title: existingListing.title,
        price: Number(existingListing.price),
        currency: existingListing.currency,
        condition: existingListing.condition ?? undefined,
        categoryId: Number(existingListing.categoryId),
        description: existingListing.description ?? "",
        location: existingListing.location ?? "",
        address: existingListing.address ?? "",
        latitude: existingListing.latitude ?? undefined,
        longitude: existingListing.longitude ?? undefined,
        // Backend may return null for older listings before the column was added; treat as true.
        negotiable: existingListing.negotiable !== false,
      });
      if (existingListing.category) {
        setSelectedCategory(existingListing.category as any);
      }
      // Show the saved place name on the location row.
      setMapLabel(existingListing.location ?? null);
      // Prefer image_attachments (carry the blob id so a removed photo can be
      // purged server-side); fall back to plain urls for older payloads.
      if (existingListing.imageAttachments?.length) {
        setPhotos(existingListing.imageAttachments.map((a: { id: string; url: string }) => ({ uri: a.url, isRemote: true, id: a.id })));
      } else if (existingListing.images) {
        setPhotos(existingListing.images.map((uri: string) => ({ uri, isRemote: true })));
      }
    }
  }, [existingListing, isEdit, reset]);

  // Prefill from the duplicate source once loaded — text fields only, NEVER
  // photos, and no id is set so submit always goes through the create
  // (POST /my/listings) path as a brand-new draft.
  useEffect(() => {
    if (isDuplicate && duplicateSource) {
      reset({
        title: duplicateSource.title,
        price: Number(duplicateSource.price),
        currency: duplicateSource.currency,
        condition: duplicateSource.condition ?? undefined,
        categoryId: Number(duplicateSource.categoryId),
        description: duplicateSource.description ?? "",
        location: duplicateSource.location ?? "",
        address: duplicateSource.address ?? "",
        latitude: duplicateSource.latitude ?? undefined,
        longitude: duplicateSource.longitude ?? undefined,
        negotiable: duplicateSource.negotiable !== false,
      });
      if (duplicateSource.category) {
        setSelectedCategory(duplicateSource.category as any);
      }
      setMapLabel(duplicateSource.location ?? null);
      setDuplicateNoticeVisible(true);
      // Photos intentionally left empty — seller re-adds them.
    }
  }, [isDuplicate, duplicateSource, reset]);

  // If the source listing can't be loaded (deleted, 404, network error) —
  // degrade gracefully to a blank draft form instead of crashing.
  useEffect(() => {
    if (isDuplicate && isDuplicateSourceError) {
      toast.error(t("listing.form.duplicateLoadError"));
    }
  }, [isDuplicate, isDuplicateSourceError, t]);

  // ── Draft autosave (new listings only) ─────────────────────────────────────
  // Offer to restore a previously saved draft on first open.
  useEffect(() => {
    if (isEdit || isDuplicate) return;
    let active = true;
    AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
      if (!active || !raw) return;
      try {
        const snap = JSON.parse(raw) as DraftSnapshot;
        const v = snap?.values ?? {};
        if (v.title || v.description || v.price || snap?.category) {
          setRestorableDraft(snap);
        }
      } catch {
        /* corrupt draft — ignore */
      }
    });
    return () => { active = false; };
  }, [isEdit]);

  // Persist the form (debounced) as the user types.
  useEffect(() => {
    if (isEdit || isDuplicate) return;
    let handle: ReturnType<typeof setTimeout> | null = null;
    const sub = watch((values) => {
      if (handle) clearTimeout(handle);
      handle = setTimeout(() => {
        if (!values.title && !values.description && !values.price && !selectedCategory) return;
        const snap: DraftSnapshot = {
          values,
          mapLabel,
          category: selectedCategory,
          savedAt: Date.now(),
        };
        AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(snap)).catch(() => {});
      }, 800);
    });
    return () => {
      sub.unsubscribe();
      if (handle) clearTimeout(handle);
    };
  }, [isEdit, watch, mapLabel, selectedCategory]);

  const clearDraft = useCallback(() => {
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
  }, []);

  const handleRestoreDraft = useCallback(() => {
    if (!restorableDraft) return;
    reset({ currency: "AFN", ...restorableDraft.values });
    setMapLabel(restorableDraft.mapLabel ?? null);
    if (restorableDraft.category) setSelectedCategory(restorableDraft.category);
    setRestorableDraft(null);
  }, [restorableDraft, reset]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft();
    setRestorableDraft(null);
  }, [clearDraft]);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  // Refresh every cache that could show this listing's stale data: my-listings,
  // the buyer browse feed, similar rails, and this listing's detail query — so
  // an edit (e.g. a newly added location) shows immediately without a reload.
  const invalidateListingCaches = () => {
    qc.invalidateQueries({ queryKey: ["my-listings"] });
    qc.invalidateQueries({ queryKey: ["browse-listings"] });
    qc.invalidateQueries({ queryKey: ["listings-similar"] });
    qc.invalidateQueries({ queryKey: ["listing"] });
    if (isEdit && listingId) {
      qc.invalidateQueries({ queryKey: ["listing", String(listingId)] });
    }
    // The listing was saved — drop any autosaved draft.
    clearDraft();
  };

  // signed_ids of remote photos that were loaded but the user has since removed
  // — sent so the backend purges exactly those, keeping the rest of the gallery.
  const computeRemovedImageIds = useCallback((): string[] => {
    const originalIds: string[] = existingListing?.imageAttachments?.map((a: { id: string; url: string }) => a.id) ?? [];
    const keptIds = new Set(
      photos.filter((p) => p.isRemote && p.id).map((p) => p.id as string)
    );
    return originalIds.filter((id: string) => !keptIds.has(id));
  }, [existingListing, photos]);

  const saveMutation = useMutation({
    mutationFn: async (values: ListingFormValues) => {
      const imageUris = photos.filter((p) => !p.isRemote).map((p) => p.uri);
      // remote photos are already on the server; only upload new local ones
      if (isEdit && listingId) {
        return listingsAPI.updateListingWithImages(listingId, values, imageUris, computeRemovedImageIds());
      }
      return listingsAPI.createListingWithImages(values, imageUris);
    },
    onSuccess: (listing) => {
      invalidateListingCaches();
      toast.success(isPublished ? t("listing.form.saved") : t("listing.form.savedDraft"));
      // TASK-J952: never dump the seller onto the Browse tab.
      //  - Editing an existing listing → return to wherever this form was
      //    opened from (My Listings or the owner detail), so the seller
      //    keeps their place and sees the refreshed data there.
      //  - Saving a brand-new listing as a draft → land on its own owner
      //    detail (Publish action visible), never the Browse tab.
      if (isEdit) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(`/(main)/my-listings/${listing.id}` as never);
        }
      } else {
        router.replace(`/(main)/my-listings/${listing.id}` as never);
      }
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
        listing = await listingsAPI.updateListingWithImages(listingId, values, imageUris, computeRemovedImageIds());
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
    onSuccess: (listing) => {
      invalidateListingCaches();
      toast.success(t("listing.form.published"));
      // TASK-J952: this is the single highest-intent moment in the app —
      // land the seller on their OWN listing (never the Browse tab) with a
      // `published=1` param so the owner detail can show the one-time
      // PublishSuccessSheet (share / view as buyer / post another).
      router.replace(`/(main)/my-listings/${listing.id}?published=1` as never);
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

  // TASK-J952: cancelling (with or without unsaved changes) must return the
  // seller to wherever this form was opened FROM — never blow the stack away
  // and land on the Browse tab. `router.canGoBack()` covers both the EDIT
  // case (opened from My Listings or the owner detail) and the NEW case
  // (opened from "Post a listing"); only when there is truly no back stack
  // (e.g. a hard deep-link into the edit route) do we fall back to a named
  // route — the listing's own owner detail when editing, otherwise Browse.
  const goBackOrFallback = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (isEdit && listingId) {
      router.replace(`/(main)/my-listings/${listingId}` as never);
    } else {
      router.replace("/(main)/(tabs)/browse" as never);
    }
  };

  const onCancel = () => {
    if (!isDirty && photos.every((p) => p.isRemote)) {
      goBackOrFallback();
      return;
    }
    confirmAlert(
      t("listing.form.discardTitle"),
      t("listing.form.discardMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("listing.form.discardConfirm"),
          style: "destructive",
          onPress: goBackOrFallback,
        },
      ]
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <ScreenContainer scrollable={false} padded={false}>
    {/* -------------------------------------------------------------------- */}
    {/* Top toolbar — back button + primary actions. Always visible at the    */}
    {/* top (no scrolling to reach Save/Publish). Plain object-style          */}
    {/* Pressables (a function `style` is dropped by NativeWind → invisible   */}
    {/* button); colors via useColors() so it respects light/dark.           */}
    {/* -------------------------------------------------------------------- */}
    <View
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <BackButton onPress={onCancel} />
      <View style={{ flex: 1 }} />
      {isPublished ? (
        // Editing a published listing → just save the changes (status unchanged)
        <Pressable
          onPress={onSaveDraft}
          disabled={isLoading}
          accessibilityRole="button"
          android_ripple={{ color: colors.primaryForeground }}
          style={[styles.topBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }]}
        >
          <Text style={[styles.topBtnLabel, { color: colors.primaryForeground }]}>
            {isLoading ? t("common.loading") : t("common.save")}
          </Text>
        </Pressable>
      ) : (
        <>
          <Pressable
            onPress={onSaveDraft}
            disabled={isLoading}
            accessibilityRole="button"
            android_ripple={{ color: colors.muted }}
            style={[styles.topBtnOutline, { borderColor: colors.border, opacity: isLoading ? 0.5 : 1 }]}
          >
            <Text style={[styles.topBtnLabel, { color: colors.foreground }]}>
              {t("listing.form.saveDraft")}
            </Text>
          </Pressable>
          <Pressable
            onPress={onPublish}
            disabled={isLoading}
            accessibilityRole="button"
            android_ripple={{ color: colors.primaryForeground }}
            style={[styles.topBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }]}
          >
            <Text style={[styles.topBtnLabel, { color: colors.primaryForeground }]}>
              {isLoading && isSubmittingPublish ? t("common.loading") : t("listing.publish")}
            </Text>
          </Pressable>
        </>
      )}
    </View>
    <KeyboardAvoidingView
      style={styles.flex}
      // Platform audit (2026-06-18):
      //   iOS "padding" — lifts the scroll view so keyboard doesn't cover inputs.
      //   Android "height" — shrinks the KAV height so the ScrollView recalculates
      //   and the submit bar remains reachable while typing. Was previously `undefined`
      //   (KAV did nothing on Android, leaving the keyboard overlapping the form).
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Screen title */}
        <Text className="text-2xl font-bold" style={{ marginBottom: 24, color: colors.foreground }}>
          {isEdit ? t("listing.edit") : t("listing.create")}
        </Text>

        {/* Duplicated-from notice — shown once the source listing's fields are loaded */}
        {duplicateNoticeVisible && (
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: colors.primaryAlpha,
              borderWidth: 1,
              borderColor: colors.primary,
              borderRadius: 12,
              padding: 12,
              marginBottom: 20,
            }}
            testID="listing-form-duplicated-notice"
          >
            <Copy size={16} color={colors.primary} />
            <Text
              className="text-sm"
              style={{ flex: 1, color: colors.foreground, textAlign: isRtl ? "right" : "left" }}
            >
              {t("listing.form.duplicatedNotice")}
            </Text>
          </View>
        )}

        {/* Restore unsaved draft */}
        {restorableDraft && (
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: colors.primaryAlpha,
              borderWidth: 1,
              borderColor: colors.primary,
              borderRadius: 12,
              padding: 12,
              marginBottom: 20,
            }}
          >
            <Text className="text-sm" style={{ flex: 1, color: colors.foreground, textAlign: isRtl ? "right" : "left" }}>
              {t("listing.form.draftFound")}
            </Text>
            <Pressable
              onPress={handleDiscardDraft}
              hitSlop={8}
              style={{ paddingHorizontal: 8, paddingVertical: 6, minHeight: 44, justifyContent: "center" }}
              android_ripple={{ color: colors.muted, borderless: true }}
            >
              <Text className="text-sm font-semibold" style={{ color: colors.mutedForeground }}>
                {t("listing.form.draftDiscard")}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleRestoreDraft}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary, minHeight: 44, justifyContent: "center" }}
              android_ripple={{ color: colors.muted, borderless: true }}
            >
              <Text className="text-sm font-bold" style={{ color: colors.primaryForeground }}>
                {t("listing.form.draftRestore")}
              </Text>
            </Pressable>
          </View>
        )}

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
            <Text className="text-xs" style={{ color: colors.destructive, marginTop: 4 }}>
              {t("listing.form.titleRequired")}
            </Text>
          )}
          <Text className="text-xs" style={{ color: colors.mutedForeground, textAlign: isRtl ? "left" : "right", marginTop: 4 }}>
            {`${watch("title")?.length ?? 0}/150`}
          </Text>
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* 3. Price + Currency                                                 */}
        {/* ------------------------------------------------------------------ */}
        <View style={styles.field}>
          <Label className="mb-1">
            {t("common.price")}
            <Text style={{ color: colors.destructive }}> *</Text>
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
            {/* Currency picker button */}
            <Pressable
              style={[
                styles.currencyBtn,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                  flexDirection: isRtl ? "row-reverse" : "row",
                },
              ]}
              onPress={() => setCurrencyPickerVisible(true)}
              android_ripple={{ color: colors.border, borderless: false }}
            >
              <Coins size={14} color={colors.mutedForeground} />
              <Text className="text-sm font-semibold" style={{ color: colors.foreground, marginHorizontal: 4 }}>
                {currency}
              </Text>
              <ChevronRight size={12} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {errors.price && (
            <Text className="text-xs" style={{ color: colors.destructive, marginTop: 4 }}>
              {t("listing.form.priceRequired")}
            </Text>
          )}

          {/* Negotiable toggle — placed inline below price so seller sees the pairing */}
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 12,
              paddingVertical: 8,
              paddingHorizontal: 4,
              borderRadius: 8,
            }}
          >
            <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 8, flex: 1 }}>
              <ToggleRight size={16} color={colors.mutedForeground} />
              <Text className="text-sm" style={{ color: colors.foreground, textAlign: isRtl ? "right" : "left" }}>
                {t("listing.form.negotiableLabel")}
              </Text>
            </View>
            <Controller
              control={control}
              name="negotiable"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  accessibilityLabel={t("listing.form.negotiableLabel")}
                />
              )}
            />
          </View>
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* 4. Category                                                         */}
        {/* ------------------------------------------------------------------ */}
        <View style={styles.field}>
          <Label className="mb-1">
            {t("common.category")}
            <Text style={{ color: colors.destructive }}> *</Text>
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
                android_ripple={{ color: colors.muted }}
              >
                <Text
                  className="text-sm"
                  style={{ color: selectedCategory ? colors.foreground : colors.mutedForeground, textAlign: isRtl ? "right" : "left" }}
                >
                  {selectedCategory
                    ? categoryName(selectedCategory)
                    : t("listing.form.selectCategoryPlaceholder")}
                </Text>
              </Pressable>
            )}
          />
          {errors.categoryId && (
            <Text className="text-xs" style={{ color: colors.destructive, marginTop: 4 }}>
              {t("listing.form.categoryRequired")}
            </Text>
          )}
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* 4b. Condition                                                       */}
        {/* ------------------------------------------------------------------ */}
        <View style={styles.field}>
          <Label className="mb-1">{t("listing.condition.label")}</Label>
          <Controller
            control={control}
            name="condition"
            render={({ field }) => (
              <ConditionChips
                value={field.value ?? null}
                onChange={(c) => field.onChange(c ?? undefined)}
              />
            )}
          />
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
        {/* 6. Location — exact point on the map (search or drop a pin)         */}
        {/* ------------------------------------------------------------------ */}
        <View style={styles.field}>
          <Label className="mb-1">
            {t("common.location")}
            <Text style={{ color: colors.destructive }}> *</Text>
          </Label>
          <Pressable
            style={[
              styles.pickerRow,
              {
                borderColor: errors.latitude
                  ? colors.destructive
                  : hasExactLocation
                  ? colors.primary
                  : colors.border,
                backgroundColor: colors.card,
                flexDirection: isRtl ? "row-reverse" : "row",
              },
            ]}
            onPress={() => setLocationPickerVisible(true)}
            android_ripple={{ color: colors.muted }}
          >
            <MapPin size={16} color={errors.latitude ? colors.destructive : hasExactLocation ? colors.primary : colors.mutedForeground} />
            <Text
              className="text-sm"
              style={{
                flex: 1,
                color: hasExactLocation ? colors.foreground : errors.latitude ? colors.destructive : colors.mutedForeground,
                marginHorizontal: 8,
                textAlign: isRtl ? "right" : "left",
              }}
              numberOfLines={1}
            >
              {hasExactLocation
                ? mapLabel ?? t("listing.form.locationSet")
                : t("listing.form.tapToSetLocation")}
            </Text>
            <ChevronRight size={16} color={colors.mutedForeground} />
          </Pressable>
          {errors.latitude && (
            <Text className="text-xs" style={{ color: colors.destructive, marginTop: 4 }}>
              {t("listing.form.locationRequired")}
            </Text>
          )}
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* 7. Address                                                          */}
        {/* ------------------------------------------------------------------ */}
        <View style={styles.field}>
          <Label className="mb-1">{t("listing.form.addressLabel")}</Label>
          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={t("listing.form.addressPlaceholder")}
                style={{ textAlign: isRtl ? "right" : "left" }}
              />
            )}
          />
          <Text className="text-xs" style={{ color: colors.mutedForeground, marginTop: 4, textAlign: isRtl ? "right" : "left" }}>
            {t("listing.form.addressHint")}
          </Text>
        </View>

      </ScrollView>

      {/* -------------------------------------------------------------------- */}
      {/* Category picker sheet                                                 */}
      {/* -------------------------------------------------------------------- */}
      <CategoryPicker
        visible={categoryPickerVisible}
        selectedId={selectedCategory?.id ?? null}
        onSelect={(cat) => {
          setSelectedCategory(cat);
          setValue("categoryId", cat.id, { shouldValidate: true });
          setCategoryPickerVisible(false);
        }}
        onClose={() => setCategoryPickerVisible(false)}
      />

      {/* -------------------------------------------------------------------- */}
      {/* Currency picker — raw Modal (consistent with all sheets in project)   */}
      {/* -------------------------------------------------------------------- */}
      <Modal
        visible={currencyPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCurrencyPickerVisible(false)}
      >
        <Pressable
          style={[styles.currencyBackdrop, { backgroundColor: colors.darkScrim }]}
          onPress={() => setCurrencyPickerVisible(false)}
        />
        <View
          style={[
            styles.currencySheet,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
            },
          ]}
        >
          {/* drag handle */}
          <View style={styles.currencyHandle}>
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
          </View>
          <Text
            className="text-lg font-semibold"
            style={{ color: colors.foreground, marginBottom: 4, paddingHorizontal: 16 }}
          >
            {t("listing.form.selectCurrency")}
          </Text>
          {(
            [
              { value: "AFN", label: t("listing.form.currencyAFN") },
              { value: "USD", label: t("listing.form.currencyUSD") },
              { value: "EUR", label: t("listing.form.currencyEUR") },
            ] as const
          ).map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.currencyOption,
                {
                  flexDirection: isRtl ? "row-reverse" : "row",
                  borderBottomColor: colors.border,
                  backgroundColor: currency === opt.value ? colors.muted : "transparent",
                },
              ]}
              onPress={() => {
                setValue("currency", opt.value, { shouldValidate: true });
                setCurrencyPickerVisible(false);
              }}
              android_ripple={{ color: colors.muted }}
            >
              <Text className="text-sm" style={{ color: colors.foreground, flex: 1 }}>
                {opt.label}
              </Text>
              {currency === opt.value && (
                <Check size={16} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </Modal>

      {/* -------------------------------------------------------------------- */}
      {/* Location picker (map) — search a place or drop an exact pin           */}
      {/* -------------------------------------------------------------------- */}
      <LocationRangePicker
        visible={locationPickerVisible}
        mode="point"
        initialCoords={hasExactLocation ? { latitude: latitude!, longitude: longitude! } : null}
        initialRadius={5}
        initialLabel={mapLabel}
        onClose={() => setLocationPickerVisible(false)}
        onConfirm={({ coords, label }) => {
          setValue("latitude", coords.latitude);
          setValue("longitude", coords.longitude);
          setMapLabel(label);
          // The precise place name becomes the listing's location text.
          setValue("location", label ?? "", { shouldValidate: true });
        }}
      />
    </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
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
  currencyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  categoryBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  pickerRow: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: "center",
    gap: 4,
  },
  currencyOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    minHeight: 44,
  },
  currencyBackdrop: {
    flex: 1,
    // backgroundColor is applied inline via colors.darkScrim (useColors token)
  },
  currencySheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    // Platform audit (2026-06-18): iOS bottom safe-area is 34pt (home indicator);
    // Android has no equivalent inset → 16pt is the correct fallback.
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  currencyHandle: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  topBtn: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  topBtnOutline: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  topBtnLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
});
