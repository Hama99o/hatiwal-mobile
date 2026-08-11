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
 *
 * TASK-V395 — "Save draft" vs "Publish" have different readiness bars, both
 * driven by the single source of truth `getPublishBlockers` (listing-form/
 * publishReadiness.ts): a draft only needs title + price + category
 * (mirrors hatiwal-api's Listing validations); Publish additionally needs
 * ≥1 photo and exact map coordinates. Neither path is ever a silent no-op —
 * a blocked submit always toasts the missing fields and scrolls to the first
 * one.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Pressable,
  LayoutChangeEvent,
  BackHandler,
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
import { listingsAPI, Listing } from "@/api/listings";
import { Category } from "@/api/categories";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { Textarea } from "@/components/reusables/textarea";
import { Label } from "@/components/reusables/label";
import { Separator } from "@/components/reusables/separator";
import { Switch } from "@/components/reusables/switch";
import { Button } from "@/components/reusables/button";

import { PhotosSection, PhotoItem } from "./listing-form/PhotosSection";
import { getPublishBlockers, PublishBlocker } from "./listing-form/publishReadiness";
import { CategoryPicker } from "@/components/common/CategoryPicker";
import { ConditionChips } from "@/components/common/ConditionChips";
import { LocationRangePicker } from "@/components/common/LocationRangePicker";
import { BackButton } from "@/components/common/BackButton";
import { FieldError } from "@/components/common/FieldError";
import AsyncStorage from "@react-native-async-storage/async-storage";

// TASK-P736 — maps each publish blocker to the translation key for its
// short field name; reused across all 3 locales so the toast list always
// matches the labels already shown next to the fields themselves.
const BLOCKER_LABEL_KEY: Record<PublishBlocker, string> = {
  photos: "common.photos",
  title: "listing.title",
  price: "common.price",
  category: "common.category",
  location: "common.location",
};

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
  // Coordinates — used for distance-based filtering. Optional at the zod
  // level (TASK-V395): a DRAFT may legitimately have no map pin yet, mirroring
  // hatiwal-api's Listing validations (title/price/currency/category only —
  // see app/models/listing.rb). `getPublishBlockers({ mode: "publish" })`
  // — called separately by onPublish/onSavePublished before mutating — is
  // what actually enforces "coordinates required to go live"; zod no longer
  // gates it for every submit path.
  // coerce: the API returns decimal columns as strings (e.g. "48.947681"), same as price/categoryId.
  // finite() (when present) rejects Infinity/NaN.
  latitude: z.coerce.number().finite().optional(),
  longitude: z.coerce.number().finite().optional(),
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

  // TASK-P736 — publish readiness: block photoless listings and never let
  // Publish fail silently. `photosError` drives the destructive border +
  // message on PhotosSection; `sectionYRef` records each field's on-screen
  // y (via onLayout) so a blocked Publish can scroll straight to the first
  // missing field instead of leaving the seller stranded on an unrelated
  // part of the form.
  const [photosError, setPhotosError] = useState<string | null>(null);
  // TASK-V395 — latitude/longitude are now optional at the zod level (a draft
  // may have no pin), so zod can no longer set `errors.latitude`. This state
  // is the exact mirror of `photosError`: it drives the location row's
  // destructive border/icon/message for a blocked Publish, and is cleared
  // the instant a pin is confirmed via LocationRangePicker.
  const [locationError, setLocationError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const sectionYRef = useRef<Partial<Record<PublishBlocker, number>>>({});

  // ---------------------------------------------------------------------------
  // Load existing listing in edit mode
  // ---------------------------------------------------------------------------
  // CYCLE-3 CR fix: query key must be a STRING id — MyListingDetail.tsx (the
  // owner-detail screen this form dismisses/replaces/backs to) keys its own
  // `useQuery` as `["my-listing", id]` where `id` comes straight from
  // `useLocalSearchParams` (always a string). Keying this screen's query with
  // the raw NUMBER `listingId` created a SEPARATE cache entry
  // (`["my-listing", 42]` !== `["my-listing", "42"]`) — `qc.setQueryData` below
  // silently wrote into a cache entry MyListingDetail never reads. Every
  // "my-listing" key in this file is now `String(...)` to match.
  const { data: existingListing } = useQuery({
    queryKey: ["my-listing", String(listingId)],
    queryFn: () => listingsAPI.getMyListing(listingId!),
    enabled: isEdit && !!listingId,
  });

  // ---------------------------------------------------------------------------
  // Load the source listing to duplicate (text fields only — see below)
  // ---------------------------------------------------------------------------
  const { data: duplicateSource, isError: isDuplicateSourceError } = useQuery({
    queryKey: ["my-listing", String(duplicateFromId)],
    queryFn: () => listingsAPI.getMyListing(duplicateFromId!),
    enabled: isDuplicate && !!duplicateFromId,
    retry: false,
  });

  // Refetch the listing every time the edit form comes into focus so the
  // user always sees the latest data (not a stale cache from a previous visit).
  useFocusEffect(
    useCallback(() => {
      if (isEdit && listingId) {
        qc.invalidateQueries({ queryKey: ["my-listing", String(listingId)] });
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
  // TASK-V395 — latitude/longitude are optional at the zod level now, so
  // `errors.latitude` will rarely fire; `locationError` (state, set by
  // `handlePublishBlockers`) is the primary driver. Keep the `errors.latitude`
  // fallback for defensiveness — it mirrors the exact pattern PhotosSection
  // already uses (`photosError ?? undefined`).
  const locationErrorMessage = locationError ?? (errors.latitude ? t("listing.form.locationRequired") : null);

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
      // CYCLE-3 CR fix: seed the owner-detail cache directly with the fresh
      // listing — same string key MyListingDetail reads (see the `useQuery`
      // comment above) — so whichever screen we land/return on (a brand-new
      // owner detail, or an existing one we `back()`/`replace()` to) shows
      // the just-saved data immediately instead of a stale flash while its
      // own focus-refetch catches up.
      // CYCLE-5 CR fix: MERGE, don't replace. This mutation's payload comes
      // from PUT/POST /my/listings (`view: :detailed`), while the cache entry
      // is consumed by MyListingDetail via getMyListing (`view: :owner_detailed`
      // = :detailed + the owner-only `sale` block). A straight replace would
      // silently delete `listing.sale` — e.g. a RESERVED listing's "Reserved
      // for <buyer>" card would vanish until the next focus-refetch (and stay
      // gone if that refetch fails offline). `:detailed` is a strict subset of
      // `:owner_detailed` apart from `sale`, so merging keeps the buyer block
      // while still applying every fresh field from this save.
      qc.setQueryData(
        ["my-listing", String(listing.id)],
        (prev: Listing | undefined) => (prev ? { ...prev, ...listing } : listing)
      );
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
      // CYCLE-3 CR fix: seed the owner-detail cache directly, BEFORE
      // navigating, with the just-published listing — same string key
      // MyListingDetail's own `useQuery` reads (`["my-listing", String(id)]`,
      // see the `existingListing` query above). `dismissTo` below very often
      // lands on an EXISTING owner-detail screen instance already in the
      // stack (My Listings → owner detail → Edit → Publish) whose cache still
      // holds the PRE-edit listing until its focus-refetch catches up; without
      // this, the PublishSuccessSheet (and the page underneath it) can
      // instantiate against — or briefly flash — stale data, and a failed
      // background refetch would otherwise change nothing (the write here
      // doesn't depend on that refetch at all).
      // CYCLE-5 CR fix: merge, not replace — see the identical comment in
      // saveMutation.onSuccess above; this payload is also `view: :detailed`
      // and must not clobber the owner-only `sale` block already cached.
      qc.setQueryData(
        ["my-listing", String(listing.id)],
        (prev: Listing | undefined) => (prev ? { ...prev, ...listing } : listing)
      );
      // No toast here — the PublishSuccessSheet on the owner detail screen
      // (triggered by the `published=1` param below) already communicates
      // the outcome; a toast on top of it would duplicate the same message.
      //
      // TASK-J952 (review fix): use `dismissTo`, not `replace`. When this
      // form was opened FROM that same owner-detail screen (My Listings →
      // owner detail → Edit → Publish), `dismissTo` pops back to the
      // EXISTING owner-detail entry already in the stack and merges the new
      // `published=1` param into it — instead of pushing a second, stale
      // owner-detail screen on top of the one already there (which would
      // require an extra back-tap and briefly show un-refreshed data). When
      // there is no such screen in the stack (a brand-new listing opened via
      // "Post a listing"), `dismissTo` falls back to replacing the current
      // screen — the same single-entry result `replace` gave before.
      router.dismissTo(`/(main)/my-listings/${listing.id}?published=1` as never);
    },
    onError: () => {
      toast.error(t("listing.form.publishError"));
    },
  });

  // ---------------------------------------------------------------------------
  // TASK-P736 — publish readiness helpers
  // ---------------------------------------------------------------------------

  // Records each field section's on-screen y position (relative to the
  // ScrollView's content) as it lays out, so a blocked Publish can scroll
  // straight to the first missing field.
  const registerSectionY = useCallback(
    (blocker: PublishBlocker) => (e: LayoutChangeEvent) => {
      sectionYRef.current[blocker] = e.nativeEvent.layout.y;
    },
    []
  );

  const scrollToBlocker = useCallback((blocker: PublishBlocker) => {
    const y = sectionYRef.current[blocker];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
  }, []);

  // Single place that turns a list of blockers into the toast + destructive
  // photo/location state + scroll — used by BOTH submit paths (Publish AND,
  // since TASK-V395, Save Draft), for both the zod `onInvalid` path and the
  // photo/location pre-check inside `onValid` (zod can't see `photos`, and
  // no longer gates `location` either), so the toast copy and the scroll
  // target always come from the same source of truth (`getPublishBlockers`).
  // `mode` only selects which toast string to show — "draft" and "publish"
  // never disagree on WHICH fields are missing, only on the copy around them.
  const handlePublishBlockers = useCallback(
    (blockers: PublishBlocker[], mode: "publish" | "draft" = "publish") => {
      if (blockers.length === 0) return;
      setPhotosError(blockers.includes("photos") ? t("listing.form.photoRequired") : null);
      setLocationError(blockers.includes("location") ? t("listing.form.locationRequired") : null);
      const fields = blockers.map((b) => t(BLOCKER_LABEL_KEY[b])).join(", ");
      toast.error(
        t(mode === "draft" ? "listing.form.draftBlocked" : "listing.form.publishBlocked", { fields })
      );
      scrollToBlocker(blockers[0]);
    },
    [t, scrollToBlocker]
  );

  // TASK-P736 (review fix) — the shared `onInvalid` handler for all three
  // submit paths below. Before this existed, each `onInvalid` callback
  // recomputed `getPublishBlockers` from raw values ALONE and handed the
  // result straight to `handlePublishBlockers` — which early-returns on an
  // EMPTY blocker list. Since `onInvalid` only ever fires when zod's
  // `formState.errors` is non-empty (the form genuinely IS invalid), any
  // rule zod enforces that this file's own business rules don't
  // independently re-derive (e.g. title's 150-char cap, which only matters
  // for a listing created/duplicated before that cap existed) made the
  // blocker list come back empty — and the whole submit silently did
  // nothing, no toast, no scroll. Passing `fieldErrors: errors` folds any
  // such zod-only failure into the blocker list (see publishReadiness.ts);
  // the final generic toast is the last-resort backstop for the case where
  // even that mapping can't name a specific field — a bare toast beats
  // total silence.
  const handleInvalidSubmit = useCallback(
    (mode: "publish" | "draft" = "publish") => {
      const blockers = getPublishBlockers({
        values: getValues(),
        photos,
        mode,
        fieldErrors: errors,
      });
      if (blockers.length > 0) {
        handlePublishBlockers(blockers, mode);
        return;
      }
      toast.error(t("listing.form.invalidGeneric"));
    },
    [getValues, photos, errors, handlePublishBlockers, t]
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  // TASK-V395 — a draft only needs title + price + category (mirrors the
  // backend's Listing validations); photos and location are exempted via
  // `mode: "draft"`. Both the valid path (pre-check, since zod can't see
  // `photos`) and the `onInvalid` path (zod rejected title/price/category)
  // funnel through the exact same `getPublishBlockers` + `handlePublishBlockers`
  // used by Publish, so a blocked draft is NEVER a silent no-op — it always
  // toasts naming the missing fields and scrolls to the first one.
  const onSaveDraft = handleSubmit(
    (values) => {
      const blockers = getPublishBlockers({ values, photos, mode: "draft" });
      if (blockers.length > 0) {
        handlePublishBlockers(blockers, "draft");
        return;
      }
      setPhotosError(null);
      setLocationError(null);
      setIsSubmittingPublish(false);
      saveMutation.mutate(values);
    },
    () => handleInvalidSubmit("draft")
  );

  // Editing an already-published listing → the single "Save" button must
  // enforce the same readiness rules as Publish (a live listing can never be
  // left with zero photos or no coordinates either), reusing the exact
  // toast + scroll UX.
  const onSavePublished = handleSubmit(
    (values) => {
      const blockers = getPublishBlockers({ values, photos, mode: "publish" });
      if (blockers.length > 0) {
        handlePublishBlockers(blockers);
        return;
      }
      setPhotosError(null);
      setLocationError(null);
      setIsSubmittingPublish(false);
      saveMutation.mutate(values);
    },
    () => handleInvalidSubmit("publish")
  );

  const onPublish = handleSubmit(
    (values) => {
      // zod passed, but photos aren't a form field (and location is no
      // longer zod-required either) — check separately here so both paths
      // funnel through the exact same rule set.
      const blockers = getPublishBlockers({ values, photos, mode: "publish" });
      if (blockers.length > 0) {
        handlePublishBlockers(blockers);
        return;
      }
      setPhotosError(null);
      setLocationError(null);
      setIsSubmittingPublish(true);
      publishMutation.mutate(values);
    },
    // zod rejected before onValid ran (e.g. title/price/category missing) —
    // see `handleInvalidSubmit` above for why this can never be silent.
    () => handleInvalidSubmit("publish")
  );

  const isLoading = saveMutation.isPending || publishMutation.isPending;

  // TASK-J952: cancelling (with or without unsaved changes) must return the
  // seller to wherever this form was opened FROM — never blow the stack away
  // and land on the Browse tab. `router.canGoBack()` covers both the EDIT
  // case (opened from My Listings or the owner detail) and the NEW case
  // (opened from "Post a listing"); only when there is truly no back stack
  // (e.g. a hard deep-link into the edit route) do we fall back to a named
  // route — the listing's own owner detail when editing, otherwise Browse.
  const goBackOrFallback = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (isEdit && listingId) {
      router.replace(`/(main)/my-listings/${listingId}` as never);
    } else {
      router.replace("/(main)/(tabs)/browse" as never);
    }
  }, [router, isEdit, listingId]);

  const onCancel = useCallback(() => {
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
  }, [isDirty, photos, goBackOrFallback, t]);

  // CYCLE-3 CR fix: the unsaved-changes guard above only ever ran for the
  // in-app top-toolbar back button (`onCancel` wired to `<BackButton>`'s
  // `onPress`) — the ANDROID HARDWARE back button bypassed it entirely and
  // popped the screen straight away, silently discarding unsaved work.
  // `BackHandler` listeners fire in LIFO order and a `true` return means
  // "handled — stop here", so registering our OWN listener (added after,
  // hence called before, the Stack navigator's default one) and routing it
  // through the exact same `onCancel` reproduces the identical confirm-then-
  // navigate UX for the hardware button, with zero duplicated logic.
  //
  // TASK-P736 (review fix): explicit picker guard. RN's own <Modal
  // onRequestClose> already registers ITS OWN Android back handler while
  // visible — since it's registered later than this one, it normally fires
  // FIRST in BackHandler's LIFO order and this listener never even runs
  // while Category/Currency/Location is open. That ordering is correct but
  // implicit; guard for it explicitly too so closing this screen never races
  // a picker sheet if that ordering assumption ever changes, and so the
  // intent reads directly from this handler instead of depending on Modal
  // internals elsewhere in the file.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (categoryPickerVisible || currencyPickerVisible || locationPickerVisible) {
        return false;
      }
      onCancel();
      return true;
    });
    return () => subscription.remove();
  }, [onCancel, categoryPickerVisible, currencyPickerVisible, locationPickerVisible]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <ScreenContainer scrollable={false} padded={false}>
    {/* -------------------------------------------------------------------- */}
    {/* Top toolbar — back button + primary actions. Always visible at the    */}
    {/* top (no scrolling to reach Save/Publish). TASK-P736 (review fix):     */}
    {/* the RNR `Button` (44pt min tap target, built-in haptic + disabled     */}
    {/* dimming) replaces the previous hand-styled Pressables (minHeight 40). */}
    {/* colors via useColors() so it respects light/dark.                    */}
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
        // Editing a published listing → save the changes (status unchanged);
        // TASK-P736: enforces the same photo/field readiness rules as Publish.
        <Button variant="default" onPress={onSavePublished} disabled={isLoading}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primaryForeground }}>
            {isLoading ? t("common.loading") : t("common.save")}
          </Text>
        </Button>
      ) : (
        <>
          <Button variant="outline" onPress={onSaveDraft} disabled={isLoading}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>
              {t("listing.form.saveDraft")}
            </Text>
          </Button>
          <Button variant="default" onPress={onPublish} disabled={isLoading}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primaryForeground }}>
              {isLoading && isSubmittingPublish ? t("common.loading") : t("listing.publish")}
            </Text>
          </Button>
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
        ref={scrollRef}
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
        <View onLayout={registerSectionY("photos")} testID="listing-form-field-photos">
          <PhotosSection
            photos={photos}
            onChange={(next) => {
              setPhotos(next);
              // Clear the photo-required error as soon as the seller adds one back.
              if (next.length > 0) setPhotosError(null);
            }}
            error={photosError ?? undefined}
          />
        </View>

        <Separator className="my-6" />

        {/* ------------------------------------------------------------------ */}
        {/* 2. Title                                                            */}
        {/* ------------------------------------------------------------------ */}
        <View style={styles.field} onLayout={registerSectionY("title")} testID="listing-form-field-title">
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
          {errors.title && <FieldError message={t("listing.form.titleRequired")} />}
          <Text className="text-xs" style={{ color: colors.mutedForeground, textAlign: isRtl ? "left" : "right", marginTop: 4 }}>
            {`${watch("title")?.length ?? 0}/150`}
          </Text>
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* 3. Price + Currency                                                 */}
        {/* ------------------------------------------------------------------ */}
        <View style={styles.field} onLayout={registerSectionY("price")} testID="listing-form-field-price">
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
          {errors.price && <FieldError message={t("listing.form.priceRequired")} />}

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
        <View style={styles.field} onLayout={registerSectionY("category")} testID="listing-form-field-category">
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
          {errors.categoryId && <FieldError message={t("listing.form.categoryRequired")} />}
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
        <View style={styles.field} onLayout={registerSectionY("location")} testID="listing-form-field-location">
          <Label className="mb-1">
            {t("common.location")}
            <Text style={{ color: colors.destructive }}> *</Text>
          </Label>
          <Pressable
            style={[
              styles.pickerRow,
              {
                borderColor: locationErrorMessage
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
            <MapPin size={16} color={locationErrorMessage ? colors.destructive : hasExactLocation ? colors.primary : colors.mutedForeground} />
            <Text
              className="text-sm"
              style={{
                flex: 1,
                color: hasExactLocation ? colors.foreground : locationErrorMessage ? colors.destructive : colors.mutedForeground,
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
          {/* TASK-P736 (review fix) — was a copy-pasted AlertCircle + text-sm
              block (duplicating PhotosSection's local PhotoFieldError); both
              now render through the one shared FieldError component. */}
          {locationErrorMessage && <FieldError message={locationErrorMessage} />}
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
          // TASK-P736 (review fix) — `shouldDirty: true` so a category
          // picked via this sheet correctly flips `isDirty`; without it,
          // `onCancel`'s unsaved-changes guard (`!isDirty && photos.every(...)`)
          // could skip the confirm dialog entirely and silently discard a
          // just-picked category on Cancel/hardware-back.
          setValue("categoryId", cat.id, { shouldValidate: true, shouldDirty: true });
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
                // TASK-P736 (review fix) — same shouldDirty rationale as the
                // category/location setValue calls below.
                setValue("currency", opt.value, { shouldValidate: true, shouldDirty: true });
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
          // TASK-P736 (review fix) — `shouldDirty: true` on all three: a
          // dropped pin (and the derived location label) MUST flip
          // `isDirty`, or `onCancel`'s unsaved-changes guard could skip the
          // confirm dialog and silently discard a just-set map pin on
          // Cancel/hardware-back.
          setValue("latitude", coords.latitude, { shouldDirty: true });
          setValue("longitude", coords.longitude, { shouldDirty: true });
          setMapLabel(label);
          // The precise place name becomes the listing's location text.
          setValue("location", label ?? "", { shouldValidate: true, shouldDirty: true });
          // TASK-V395 — a pin was just dropped; clear the destructive
          // location state immediately (exact mirror of PhotosSection's
          // `onChange` clearing `photosError` as soon as a photo is added).
          setLocationError(null);
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
});
