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
  ActivityIndicator,
  AccessibilityInfo,
} from "react-native";
import {
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Copy,
  MapPin,
  PackageX,
  ToggleRight,
  WifiOff,
} from "lucide-react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { useForm, Controller, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useCategoryName } from "@/hooks/useCategoryName";
import { toast } from "@/lib/toast";

import { confirmAlert } from "@/utils/alert";
import { normalizeDigits } from "@/utils/normalizeDigits";
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
import { ListingFormSkeleton } from "./listing-form/ListingFormSkeleton";
import {
  getPublishBlockers,
  publishBlockedMessage,
  PublishBlocker,
  PublishBlockerMode,
} from "./listing-form/publishReadiness";
import { CategoryPicker } from "@/components/common/CategoryPicker";
import { ConditionChips } from "@/components/common/ConditionChips";
import { LocationRangePicker } from "@/components/common/LocationRangePicker";
import { BackButton } from "@/components/common/BackButton";
import { FieldError } from "@/components/common/FieldError";
import { FieldLabel } from "@/components/common/FieldLabel";
import { EmptyState } from "@/components/common/EmptyState";
import AsyncStorage from "@react-native-async-storage/async-storage";

// TASK-P736 — maps each publish blocker to the translation key for its
// short field name; reused across all 3 locales so the toast list always
// matches the labels already shown next to the fields themselves.
// "publish" (new draft → live) | "draft" (Save Draft) | "live" (TASK-P736
// review fix, CR round 3: Save on an ALREADY-live listing — same rule set as
// "publish" via `getPublishBlockers`, but its own copy: telling a seller
// editing an active listing to "publish this listing" reads as if their
// live listing were still a draft).

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

// Mirrors hatiwal-api's `Listing::MAX_PRICE`. That `price` column is
// decimal(12, 2), so a bigger value used to clear validation and then overflow
// in Postgres — the app got a 500 with no field errors and the seller saw the
// publish fail with nothing saying why. Caught here it never leaves the device.
import { apiErrorMessage } from "@/utils/apiError";

const MAX_LISTING_PRICE = 9_999_999_999.99;
// Named so the schema rule and the message the seller reads can never drift.
const MAX_LISTING_QUANTITY = 999;

const listingSchema = z.object({
  // .trim() BEFORE .min(1): the backend validates `presence: true`, which treats
  // a whitespace-only title as blank, so "   " passed here and was then rejected
  // by the server. The seller filled the form, tapped Publish, and got a server
  // error where an inline field error belonged. Trimming also keeps leading and
  // trailing spaces out of stored titles.
  title: z.string().trim().min(1).max(150),
  // coerce handles both number and string inputs (API may return "500.0" as string)
  price: z.coerce
    .number()
    .positive({ message: "Enter a valid price greater than 0" })
    .max(MAX_LISTING_PRICE, { message: "Price is too high" }),
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
  // Multi-quantity (docs/SPIKE_LISTING_QUANTITY.md). Defaults to 1 so a seller
  // with one item is never asked, and is never a publish blocker.
  // No .default() — that makes the resolver's INPUT type optional while the
  // form's value type stays required, which zod + react-hook-form cannot
  // reconcile. Every defaultValues branch supplies 1 explicitly instead.
  quantity: z.number().int().min(1).max(MAX_LISTING_QUANTITY),
});

// z.input, not z.infer. `negotiable: z.boolean().default(true)` makes the field
// OPTIONAL on the way in (the default supplies it) and REQUIRED on the way out,
// and `z.infer` is the output side — so useForm was typed with a shape its own
// resolver cannot produce, which is the TS2322/TS2345 trio this file has carried.
// The values a FORM holds are input values: the user may not have touched the
// switch yet. Runtime behaviour is unchanged — the default is still true and
// defaultValues still sets it explicitly.
type ListingFormValues = z.input<typeof listingSchema>;

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
  const { isRtl, formatNumber } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // TASK-P736 (review fix, visual hierarchy) — `status` is an OPTIONAL hint
  // forwarded by callers that already know it (useListingLifecycle's
  // `handleEdit`, seeded from the listing they're navigating away from) so
  // `isPublished` (below) doesn't have to guess `false` for the entire
  // edit-mode loading window. It is never the source of truth once
  // `existingListing` itself has loaded — only a best-effort placeholder for
  // the toolbar during that window.
  const params = useLocalSearchParams<{ id?: string; duplicateFrom?: string; status?: string }>();
  const qc = useQueryClient();

  const isEdit = !!params.id;
  const listingId = isEdit ? Number(params.id) : null;
  // TASK-P736 (review fix, CR round 3, extended CR round 4/edge case) —
  // `Number("abc")` (a bad deep link, stale notification, or broken nav
  // param) is `NaN`. This flag is checked BEFORE the loading gate below so
  // that case gets its own "listing not found" state instead of feeding a
  // permanently-disabled query (see `isEditBlocking`'s comment for why a
  // disabled query can never resolve `isLoading`/`isError`). Uses
  // `Number.isNaN` rather than `!listingId` — real listing ids are always
  // ≥1 so this is a no-op in practice today, but `!listingId` would also
  // treat a (never-issued) id of literal `0` as "invalid" via falsy-0 rather
  // than the genuine NaN case this flag exists to catch.
  const isEditIdInvalid = isEdit && Number.isNaN(listingId);

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
  // Whether the quantity input is revealed. Seeded below from the listing being
  // edited/duplicated, so a 15-unit listing reopens with its number showing.
  const [hasMultipleUnits, setHasMultipleUnits] = useState(false);
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
  // TASK-P736 (review fix, CR round 2) — `isLoading`/`isError`/`refetch` now
  // gate the render (see the loading-skeleton / retry state below). Before
  // this, the form rendered every field with its EMPTY default value while
  // this query was still in flight: on a mid-range Android device the
  // seller saw a fully blank form for their complete listing, and tapping
  // Publish inside that window fired THIS card's own "Add Photos, Title,
  // Price, Category, Location to publish this listing" toast for a listing
  // that has all of them — "never fail silently" became "fails wrongly".
  //
  // TASK-P736 (review fix, CR round 3) — this destructures `isLoading`, NOT
  // `isPending`. In @tanstack/react-query 5.x a DISABLED query (this one is
  // `enabled: isEdit && !!listingId`) keeps `status: 'pending'` forever —
  // `isPending` never becomes `false` for a query that never runs, but
  // `isLoading` (`isPending && isFetching`) correctly stays `false` because
  // `isFetching` is `false` on a disabled query. Using `isPending` here made
  // `isEditBlocking` permanently `true` for `isEditIdInvalid` (`/listing/
  // edit/abc` → `listingId = NaN` → query disabled) — a dead screen with no
  // toast, no retry, nothing but the back button. `isEditIdInvalid` (above)
  // is checked separately and FIRST in the render below, so this gate now
  // only ever has to reason about a query that is genuinely enabled.
  const {
    data: existingListing,
    isLoading: isEditLoading,
    isError: isEditError,
    error: editError,
    refetch: refetchEditListing,
  } = useQuery({
    queryKey: ["my-listing", String(listingId)],
    queryFn: () => listingsAPI.getMyListing(listingId!),
    enabled: isEdit && !!listingId,
  });
  // True only while there is genuinely nothing to show yet (first load, or a
  // hard failure with no cached data at all) — a background refetch (e.g.
  // the focus-refetch below) never re-blanks an already-rendered form. Gated
  // on `!!listingId` too so this can never latch permanently true for an
  // invalid id — that case is `isEditIdInvalid` instead (see above), whose
  // query is disabled and would otherwise never resolve `isLoading`/`isError`.
  const isEditBlocking = isEdit && !!listingId && (isEditLoading || (isEditError && !existingListing));
  // TASK-P736 (review fix, CR round 3) — discriminate the fallback's copy on
  // the REAL HTTP status, exactly like MyListingDetail.tsx's `isMissing`
  // does. `listingsAPI.getMyListing` throws an axios error carrying
  // `response.status` on every non-2xx response, so a real 404 (the seller
  // deep-linked to a listing they, or the web client, already deleted) can
  // be told apart from a network/500 error — a Retry button can never
  // succeed against a confirmed 404.
  const isEditMissing = (editError as { response?: { status?: number } } | null)?.response?.status === 404;

  // ---------------------------------------------------------------------------
  // Load the source listing to duplicate (text fields only — see below)
  // ---------------------------------------------------------------------------
  // TASK-P736 (review fix, CR round 3) — `isLoading` now gates the render the
  // same way the edit-mode query above does (`isDuplicateBlocking` below).
  // Before this, opening `?duplicateFrom=<id>` rendered a fully blank,
  // FULLY ENABLED form while this query was still in flight — tapping
  // Publish in that window fired this card's own "Add Photos, Title, Price,
  // Category, Location to publish this listing" toast for a listing that
  // has all of them, the exact "fails wrongly" bug the edit-mode skeleton
  // exists to prevent, just on the sibling prefill path. A load FAILURE is
  // intentionally NOT gated here (no `isError` in the blocking condition) —
  // that already degrades gracefully to a blank draft + toast (see the
  // `isDuplicateSourceError` effect below), which is correct for "the
  // source listing is gone, start fresh", unlike the edit path where there
  // is no fallback listing to fall back to.
  const {
    data: duplicateSource,
    isLoading: isDuplicateLoading,
    isError: isDuplicateSourceError,
  } = useQuery({
    queryKey: ["my-listing", String(duplicateFromId)],
    queryFn: () => listingsAPI.getMyListing(duplicateFromId!),
    enabled: isDuplicate && !!duplicateFromId,
    retry: false,
  });
  const isDuplicateBlocking = isDuplicate && !!duplicateFromId && isDuplicateLoading;
  // Single flag the toolbar + body render both key off — covers BOTH prefill
  // paths (edit load, duplicate-source load) so neither can ever leave
  // Save/Publish enabled against a still-blank form.
  const isFormBlocking = isEditBlocking || isDuplicateBlocking;
  // TASK-P736 (review fix, states/visual hierarchy) — the three TERMINAL
  // non-form states (bad deep link, confirmed 404, or a load failure with
  // nothing cached — see the render's `isEditIdInvalid` / `isEditBlocking`
  // branches below) render their own `EmptyState` with its own primary
  // action ("Go back" / "Retry"). Unlike the loading skeleton (where the
  // Publish control must stay mounted, disabled, so this card's own test —
  // "a Publish tap mid-load calls no API" — can press it), there is no form
  // at all in these three states, so a dimmed [Save Draft | Publish] pair
  // next to the EmptyState's own action is pure dead weight competing for
  // attention. `isEditLoading` (the genuine loading case) is intentionally
  // excluded so the skeleton's toolbar keeps its disabled controls.
  const hideFormActions = isEditIdInvalid || (isEditBlocking && !isEditLoading);

  // Refetch the listing every time the edit form comes into focus. TASK-P736
  // (review fix, CR round 3, dead-state note): this invalidation is now
  // effectively inert FOR THIS SCREEN once `prefilledListingIdRef` (below)
  // has already prefilled the current `listingId` once — the form
  // intentionally does NOT re-`reset()` on a background refetch (that would
  // clobber in-progress edits, the exact bug that guard exists to prevent).
  // What this DOES still do: keep the cache fresh for every OTHER screen
  // reading the same `["my-listing", id]` key (My Listings, the owner
  // detail this form was opened from/returns to), so they show the latest
  // data the moment this form is dismissed, without waiting on their own
  // focus-refetch to catch up.
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
      quantity: 1,
    },
  });

  // One handler shared by the switch AND the row around it. The row is 44pt tall
  // but only the ~44x24 switch used to respond to touch, so a tap on the label —
  // the obvious target, and the whole platform convention for a settings row —
  // did nothing. Found on-device: a flow tapping the label never turned it on.
  const toggleMultipleUnits = useCallback(
    (on: boolean) => {
      setHasMultipleUnits(on);
      // Off collapses back to exactly the single-item listing this was before the
      // toggle was ever touched.
      setValue("quantity", on ? 2 : 1, { shouldDirty: true });
    },
    [setValue]
  );

  // Draft autosave (new listings only) — so a half-written post survives leaving the screen.
  const [restorableDraft, setRestorableDraft] = useState<DraftSnapshot | null>(null);

  const currency = watch("currency");
  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const hasExactLocation = latitude != null && longitude != null;
  // A published listing (active/reserved/sold) can't be "saved as draft" — only
  // edited in place. Use Unpublish (on My Listings) to take it offline.
  // TASK-P736 (review fix, visual hierarchy) — while `existingListing` is
  // still loading, fall back to the `status` route-param hint (if the caller
  // provided one) instead of unconditionally `false`, so the toolbar doesn't
  // show [Save Draft | Publish] and then flip to a single [Save] the moment
  // an already-active listing's data lands. Once `existingListing` resolves
  // it is always the source of truth, regardless of what the hint said.
  const isPublished = isEdit && (existingListing ? existingListing.status !== "draft" : params.status ? params.status !== "draft" : false);
  // TASK-P736 (review fix, cross-client contract) — whether THIS listing
  // already had ≥1 photo when the edit session started (before anything the
  // seller does in this session) — see publishReadiness.ts's doc for why
  // "Save" on an already-live listing must not blanket-require a photo.
  const hadPhotosPreEdit = Boolean(existingListing?.imageAttachments?.length || existingListing?.images?.length);
  // TASK-V395 — latitude/longitude are optional at the zod level now, so
  // `errors.latitude` will rarely fire; `locationError` (state, set by
  // `handlePublishBlockers`) is the primary driver. Keep the `errors.latitude`
  // fallback for defensiveness — it mirrors the exact pattern PhotosSection
  // already uses (`photosError ?? undefined`).
  const locationErrorMessage = locationError ?? (errors.latitude ? t("listing.form.locationRequired") : null);

  // TASK-P736 (review fix, CR round 2) — guards the prefill effect below so
  // it runs ONCE per listing id, not on every `existingListing` object
  // identity change. Before this existed, the effect keyed on object
  // identity alone and unconditionally `reset(...)` + `setPhotos(...)` —
  // and because `existingListing.images` is `[]` (truthy) for a photoless
  // listing, any refetch landing while the seller was mid-edit (e.g. this
  // screen's own focus-refetch above, or a background React Query refetch)
  // replaced their locally-picked photos with `[]` and re-blocked Publish
  // on photos — the exact failure mode this card exists to prevent.
  const prefilledListingIdRef = useRef<number | null>(null);

  // Prefill form in edit mode once data is loaded (and not again for the
  // same listing id — see `prefilledListingIdRef` above).
  useEffect(() => {
    if (existingListing && isEdit && prefilledListingIdRef.current !== listingId) {
      prefilledListingIdRef.current = listingId;
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
        quantity: existingListing.quantity ?? 1,
      });
      // Reveal the count when the listing already has one. Without this the
      // switch reads OFF while the form silently holds quantity: 15 — the
      // seller can neither see the number nor correct it.
      setHasMultipleUnits((existingListing.quantity ?? 1) > 1);
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
    // TASK-P736 (review fix, CR round 3, NIT) — `listingId` is read (and
    // assigned) in the body above; added to the deps so the guard's
    // correctness doesn't silently depend on `existingListing` always
    // changing identity whenever `listingId` does (true today only because
    // they share a query key — harmless coincidence, not a guarantee).
  }, [existingListing, isEdit, listingId, reset]);

  // TASK-P736 (review fix, CR round 3) — guards this effect exactly like
  // `prefilledListingIdRef` guards the edit prefill above: runs ONCE per
  // duplicate source id, not on every `duplicateSource` object identity
  // change. Before this existed, a refetch of the source landing while the
  // seller was mid-edit (rare, but the query has no `staleTime`) would
  // `reset(...)` the form back to the source's original values, silently
  // clobbering whatever the seller had already typed.
  const prefilledSourceIdRef = useRef<number | null>(null);

  // Prefill from the duplicate source once loaded — text fields only, NEVER
  // photos, and no id is set so submit always goes through the create
  // (POST /my/listings) path as a brand-new draft.
  useEffect(() => {
    if (isDuplicate && duplicateSource && prefilledSourceIdRef.current !== duplicateFromId) {
      prefilledSourceIdRef.current = duplicateFromId;
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
        quantity: duplicateSource.quantity ?? 1,
      });
      // Same as edit mode: a duplicated batch listing must reopen showing its
      // count, since the seller is most likely about to change it.
      setHasMultipleUnits((duplicateSource.quantity ?? 1) > 1);
      if (duplicateSource.category) {
        setSelectedCategory(duplicateSource.category as any);
      }
      setMapLabel(duplicateSource.location ?? null);
      setDuplicateNoticeVisible(true);
      // Photos intentionally left empty — seller re-adds them.
    }
  }, [isDuplicate, duplicateSource, duplicateFromId, reset]);

  // If the source listing can't be loaded (deleted, 404, network error) —
  // degrade gracefully to a blank draft form instead of crashing.
  useEffect(() => {
    if (isDuplicate && isDuplicateSourceError) {
      toast.error(t("listing.form.duplicateLoadError"));
    }
  }, [isDuplicate, isDuplicateSourceError, t]);

  // TASK-P736 (review fix, edge case) — `?duplicateFrom=<non-numeric>` (a
  // bad deep link) makes `duplicateFromId` `NaN`, so the query above is
  // DISABLED (`enabled: isDuplicate && !!duplicateFromId`) and never runs —
  // `isDuplicateSourceError` above can therefore never fire for this case,
  // and the seller previously landed on a silent blank create form with no
  // explanation at all, the same class of silent failure this card exists
  // to kill. Same toast copy as a genuine load failure — either way, the
  // seller starts fresh with a blank draft and knows why.
  useEffect(() => {
    if (isDuplicate && !duplicateFromId) {
      toast.error(t("listing.form.duplicateLoadError"));
    }
  }, [isDuplicate, duplicateFromId, t]);

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
    onError: (err) => {
      // Show the server's own reason ("Price must be less than or equal to
      // 9999999999.99") instead of a generic "couldn't save" — the seller
      // cannot fix what they are not told.
      // Announced as well as toasted. The blocked-submit path below already does
      // this; a FAILED save or publish is the same category of "why did nothing
      // happen" and was reaching screen-reader users as silence.
      const message = apiErrorMessage(err, t, "listing.form.saveError");
      toast.error(message);
      AccessibilityInfo.announceForAccessibility(message);
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
    onError: (err) => {
      // Announced as well as toasted. The blocked-submit path below already does
      // this; a FAILED save or publish is the same category of "why did nothing
      // happen" and was reaching screen-reader users as silence.
      const message = apiErrorMessage(err, t, "listing.form.publishError");
      toast.error(message);
      AccessibilityInfo.announceForAccessibility(message);
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
  // photo/location state + scroll — used by ALL THREE submit paths (Publish,
  // Save Draft since TASK-V395, and Save-on-a-live-listing since this
  // round), for both the zod `onInvalid` path and the photo/location
  // pre-check inside `onValid` (zod can't see `photos`, and no longer gates
  // `location` either), so the toast copy and the scroll target always come
  // from the same source of truth (`getPublishBlockers`). `mode` only
  // selects which toast/photo-error string to show — none of the three ever
  // disagree on WHICH fields are missing, only on the copy around them.
  const handlePublishBlockers = useCallback(
    (blockers: PublishBlocker[], mode: PublishBlockerMode = "publish") => {
      if (blockers.length === 0) return;
      setPhotosError(
        blockers.includes("photos")
          ? t(mode === "live" ? "listing.form.photoRequiredLive" : "listing.form.photoRequired")
          : null
      );
      setLocationError(blockers.includes("location") ? t("listing.form.locationRequired") : null);
      // TASK-P736 (review fix, CR round 3) — a bare Latin ", " between RTL
      // text runs (fa/ps) invites bidi-reordering artifacts and reads wrong
      // ("عکس‌ها, عنوان" instead of "عکس‌ها، عنوان"); `common.listSeparator`
      // is "، " for ps/fa and ", " for en, so the join always matches the
      // locale's own list punctuation.
      // Phrasing lives in publishReadiness beside the rules themselves, so this
      // screen and useListingLifecycle can never word the same block differently.
      const message = publishBlockedMessage(blockers, mode, t);
      toast.error(message);
      // TASK-P736 (review fix, CR round 3, a11y) — a `sonner-native` toast is
      // not announced by TalkBack/VoiceOver on its own; this is the card's
      // primary "why did nothing happen" signal, so "never fail silently"
      // must hold for screen-reader users too.
      AccessibilityInfo.announceForAccessibility(message);
      scrollToBlocker(blockers[0]);
    },
    [t, scrollToBlocker]
  );

  // TASK-P736 (review fix, CR round 2) — the shared `onInvalid` handler for
  // all three submit paths below. Before this existed, each `onInvalid`
  // callback recomputed `getPublishBlockers` from raw values ALONE and
  // handed the result straight to `handlePublishBlockers` — which
  // early-returns on an EMPTY blocker list. Since `onInvalid` only ever
  // fires when zod's `formState.errors` is non-empty (the form genuinely IS
  // invalid), any rule zod enforces that this file's own business rules
  // don't independently re-derive (e.g. title's 150-char cap, which only
  // matters for a listing created/duplicated before that cap existed) made
  // the blocker list come back empty — and the whole submit silently did
  // nothing, no toast, no scroll.
  //
  // CR fix: the first pass folded in `fieldErrors: errors` from the
  // `formState` DESTRUCTURE of the render this callback closes over — but
  // react-hook-form's `handleSubmit` calls `onInvalid(m.errors, event)`
  // BEFORE it publishes that same `m.errors` to `formState` (verified in
  // node_modules/react-hook-form/dist/index.cjs.js), so the closed-over
  // `errors` is always the PREVIOUS render's value (`{}` on a first
  // submit) at the exact moment `onInvalid` runs. Each `handleSubmit(...,
  // onInvalid)` call below now passes RHF's own `onInvalid` ARGUMENT
  // straight through instead of reading the stale closure — that argument
  // is always current. The final generic toast is the last-resort backstop
  // for the case where even that mapping can't name a specific field — a
  // bare toast beats total silence.
  const handleInvalidSubmit = useCallback(
    (mode: PublishBlockerMode = "publish", fieldErrors?: FieldErrors<ListingFormValues>) => {
      const blockers = getPublishBlockers({
        values: getValues(),
        photos,
        // TASK-P736 (review fix, cross-client contract) — `mode` is now
        // passed straight through to `getPublishBlockers`; "live" runs its
        // OWN rule set (photo required only if `hadPhotosPreEdit`, location
        // never required) rather than being remapped onto "publish"'s
        // stricter one. See publishReadiness.ts's file header for why.
        mode,
        hadPhotosPreEdit,
        fieldErrors,
      });
      if (blockers.length > 0) {
        handlePublishBlockers(blockers, mode);
        return;
      }
      toast.error(t("listing.form.invalidGeneric"));
      AccessibilityInfo.announceForAccessibility(t("listing.form.invalidGeneric"));
    },
    [getValues, photos, hadPhotosPreEdit, handlePublishBlockers, t]
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
    (fieldErrors) => handleInvalidSubmit("draft", fieldErrors)
  );

  // Editing an already-published listing → the single "Save" button runs
  // the "live" rule set — TASK-P736 (review fix, cross-client contract):
  // NOT the same rules as Publish. A photo is only required if the listing
  // already had one (`hadPhotosPreEdit`), and exact coordinates are never
  // required — matching hatiwal-web's form and the API's `publish?` policy,
  // neither of which enforce either. Without this, a web-created photo-less
  // or pin-less active listing would be permanently unsaveable on mobile
  // for an edit as small as a typo fix.
  const onSavePublished = handleSubmit(
    (values) => {
      const blockers = getPublishBlockers({ values, photos, mode: "live", hadPhotosPreEdit });
      if (blockers.length > 0) {
        handlePublishBlockers(blockers, "live");
        return;
      }
      setPhotosError(null);
      setLocationError(null);
      setIsSubmittingPublish(false);
      saveMutation.mutate(values);
    },
    (fieldErrors) => handleInvalidSubmit("live", fieldErrors)
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
    (fieldErrors) => handleInvalidSubmit("publish", fieldErrors)
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
  // TASK-P736 (review fix, CR round 2): explicit picker guard, corrected.
  // The previous comment claimed RN's <Modal> registers its own Android
  // `hardwareBackPress` listener that would otherwise race this one — it
  // does not: RN 0.81's `Modal.js` has no `BackHandler` reference at all: the
  // native Android dialog intercepts KEYCODE_BACK itself
  // (ReactModalHostView.kt's `setOnKeyListener`) and never lets the press
  // reach JS while a picker `<Modal>` is visible, so this listener could
  // never actually fire during that window in the first place. Kept anyway
  // as a defensive, correct guard in case that native behaviour ever
  // changes — but it must CONSUME the event (`return true` + close the
  // pickers), not `return false`: falling through hands the press to
  // @react-navigation/native's own `hardwareBackPress` listener
  // (registered earlier, so it runs SECOND in BackHandler's LIFO order),
  // which pops this screen with no discard confirmation — reintroducing the
  // exact silent-work-loss bug the CYCLE-3 fix above exists to prevent.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (categoryPickerVisible || currencyPickerVisible || locationPickerVisible) {
        setCategoryPickerVisible(false);
        setCurrencyPickerVisible(false);
        setLocationPickerVisible(false);
        return true;
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
      {/* TASK-P736 (review fix, states/visual hierarchy) — `hideFormActions`
          (see its own comment above) keeps these mounted, disabled, ONLY
          for the genuine loading skeleton — where this card's own test
          coverage requires Publish to still exist so a mid-load tap can be
          proven inert — and unmounts them entirely for the three terminal
          non-form states, so a bad deep link / confirmed 404 / retry screen
          never shows a dead [Save Draft | Publish] pair next to the
          EmptyState's own primary action.
          `isPublished` can still be `false` for a moment during a genuine
          loading window when no `status` hint was provided by the caller
          (see `isPublished`'s own comment) and then flip once the listing
          arrives already-active — that residual cosmetic flip (not a
          dead-control problem) is left for marketplace-designer polish
          (e.g. a cross-fade). */}
      {!hideFormActions && (
        isPublished ? (
          // Editing a published listing → save the changes (status unchanged);
          // TASK-P736: enforces the "live" readiness rules (see `onSavePublished`).
          // TASK-P736 (review fix, CR round 2): disabled while the edit-mode
          // query is still loading/erroring (`isFormBlocking`) — Save must
          // never fire against a still-blank prefill. Busy state keeps the
          // label and adds an `ActivityIndicator` instead of swapping to
          // `common.loading`, so the button never changes width mid-flight
          // (worst case in Dari, whose labels are already the widest).
          <Button variant="default" onPress={onSavePublished} disabled={isLoading || isFormBlocking || isEditIdInvalid}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text className="text-sm font-bold">{t("common.save")}</Text>
            )}
          </Button>
        ) : (
          <>
            <Button variant="outline" onPress={onSaveDraft} disabled={isLoading || isFormBlocking || isEditIdInvalid}>
              {/* TASK-P736 (review fix, CR round 3, busy state) — the published
                  `Save` and `Publish` below each swap in an `ActivityIndicator`
                  while busy; this outline draft button previously never did,
                  so a slow multi-photo upload on a weak connection showed two
                  dimmed buttons with zero progress cue — reading as a dead tap,
                  the exact class of problem this card exists to fix. */}
              {isLoading && !isSubmittingPublish ? (
                <ActivityIndicator size="small" color={colors.foreground} />
              ) : (
                <Text className="text-sm font-bold">{t("listing.form.saveDraft")}</Text>
              )}
            </Button>
            <Button variant="default" onPress={onPublish} disabled={isLoading || isFormBlocking || isEditIdInvalid}>
              {isLoading && isSubmittingPublish ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text className="text-sm font-bold">{t("listing.publish")}</Text>
              )}
            </Button>
          </>
        )
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

        {/* TASK-P736 (review fix, CR round 2/3) — three mutually exclusive
            non-form states, checked in this order:
            1. `isEditIdInvalid` — a bad deep link / stale nav param
               (`Number(params.id)` is `NaN`) — the edit-mode query is
               DISABLED for this case (see its comment above), so it must
               never be treated as "loading"; show a real "not found" state
               with a way back instead.
            2. `isEditBlocking` — the edit-mode listing genuinely IS loading
               (skeleton) or failed with nothing cached (retry).
            3. `isDuplicateBlocking` — the duplicate-source listing is still
               loading (skeleton) — the sibling prefill path had NO loading
               gate at all before this round.
            All three keep the toolbar Save/Publish/Save disabled
            (`isFormBlocking`, wired above). */}
        {isEditIdInvalid ? (
          <EmptyState
            icon={PackageX}
            title={t("listing.ownerDetail.notFound")}
            description={t("listing.ownerDetail.notFoundDescription")}
            action={{ label: t("common.goBack"), onPress: goBackOrFallback }}
          />
        ) : isEditBlocking ? (
          isEditLoading ? (
            <ListingFormSkeleton />
          ) : isEditMissing ? (
            // TASK-P736 (review fix, CR round 3) — a confirmed 404 (the
            // listing was deleted, e.g. from the web client) gets its own
            // copy + a Back escape hatch — Retry can never succeed against
            // a listing that is genuinely gone.
            <EmptyState
              icon={PackageX}
              title={t("listing.ownerDetail.notFound")}
              description={t("listing.ownerDetail.notFoundDescription")}
              action={{ label: t("common.goBack"), onPress: goBackOrFallback }}
            />
          ) : (
            <EmptyState
              icon={WifiOff}
              title={t("common.errorTitle")}
              description={t("common.errorDescription")}
              action={{ label: t("common.retry"), onPress: () => refetchEditListing() }}
            />
          )
        ) : isDuplicateBlocking ? (
          <ListingFormSkeleton />
        ) : (
        <>
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
          <FieldLabel nativeID="title-label" required className="mb-1">
            {t("listing.title")}
          </FieldLabel>
          <Controller
            control={control}
            name="title"
            render={({ field }) => (
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                testID="listing-form-title-input"
                placeholder={t("listing.titlePlaceholder")}
                maxLength={150}
                error={!!errors.title}
                style={{
                  textAlign: isRtl ? "right" : "left",
                }}
                aria-labelledby="title-label"
                // TASK-P736 (review fix, a11y, iOS) — `aria-labelledby` maps
                // to RN's `accessibilityLabelledBy`, which is ANDROID-ONLY;
                // on iOS the prop is silently ignored, so this Input had no
                // accessible name at all for VoiceOver. `accessibilityLabel`
                // is the cross-platform fallback — keep both.
                accessibilityLabel={t("listing.title")}
              />
            )}
          />
          {errors.title && <FieldError message={t("listing.form.titleRequired")} />}
          {/* TASK-P736 (review fix, CR round 3) — `maxLength={150}` silently
              swallows keystrokes past the cap with zero signal; the counter
              now turns destructive at the limit so a seller pasting a long
              title sees WHY typing stopped instead of assuming it's broken.
              TASK-P736 (review fix, localization) — `formatNumber` so ps/fa
              readers see their own digit script (e.g. ۰/۱۵۰), not ASCII. */}
          <Text
            className="text-xs"
            style={{
              color: (watch("title")?.length ?? 0) >= 150 ? colors.destructive : colors.mutedForeground,
              textAlign: isRtl ? "left" : "right",
              marginTop: 4,
            }}
          >
            {`${formatNumber(watch("title")?.length ?? 0)}/${formatNumber(150)}`}
          </Text>
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* 3. Price + Currency                                                 */}
        {/* ------------------------------------------------------------------ */}
        <View style={styles.field} onLayout={registerSectionY("price")} testID="listing-form-field-price">
          <FieldLabel nativeID="price-label" required className="mb-1">
            {t("common.price")}
          </FieldLabel>
          <View style={[styles.priceRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <Controller
              control={control}
              name="price"
              render={({ field }) => (
                <Input
                  value={field.value != null ? String(field.value) : ""}
                  // TASK-P736 (review fix, CR round 2) — hold the raw string
                  // in the form field (only normalizing the digit script);
                  // `zod`'s `z.coerce.number()` performs the actual numeric
                  // coercion at validate/submit time (see the schema
                  // comment). The previous `field.onChange(v ? Number(v) :
                  // undefined)` re-parsed to a Number on every keystroke,
                  // which made a decimal price impossible to type ("12."
                  // coerces to `12`, the controlled value re-renders as
                  // "12" and silently drops the trailing dot, so the next
                  // keystroke produces "125" instead of "12.5") and made
                  // Persian/Pashto numeral keypads (`Number("۸۰۰۰") ===
                  // NaN`) silently clear the field.
                  onChangeText={(v) => field.onChange(normalizeDigits(v) as unknown as number)}
                  onBlur={field.onBlur}
                  testID="listing-form-price-input"
                placeholder={t("listing.pricePlaceholder")}
                  keyboardType="numeric"
                  aria-labelledby="price-label"
                  // TASK-P736 (review fix, a11y, iOS) — see the identical
                  // fix on the Title Input above.
                  accessibilityLabel={t("common.price")}
                  error={!!errors.price}
                  style={[
                    styles.priceInput,
                    {
                      textAlign: isRtl ? "right" : "left",
                    },
                  ]}
                />
              )}
            />
            {/* Currency picker button — TASK-P736 (review fix, CR round 2):
                RNR `Button` (size "default" = minHeight 44) replaces the
                hand-rolled Pressable, which at paddingVertical 10 + 14px
                text was ~42pt — under the design system's 44px touch-target
                floor and visibly shorter than the 44pt `Input` beside it.
                The chevron flips with `isRtl` (ChevronLeft/ChevronRight) so
                it always points AWAY from the label text, matching
                BackButton/ListingHeader/Profile elsewhere in the app. */}
            <Button
              variant="outline"
              onPress={() => setCurrencyPickerVisible(true)}
              // By id, because this control's label is the CURRENCY NAME and that
              // is translated: "AFN – Afghani" in English is "افغاني" in Pashto,
              // with no currency code in it at all. Text selectors here only ever
              // worked in English.
              testID="listing-form-currency-trigger"
              accessibilityRole="button"
              // TASK-P736 (review fix, CR round 3, a11y) — `accessibilityLabel`
              // REPLACES the children a screen reader would otherwise read,
              // so a static label alone made a blind seller hear only
              // "Select Currency" with no way to hear whether their listing
              // is priced in AFN/USD/EUR. The field's IDENTITY stays in
              // `accessibilityLabel`; the CURRENT VALUE moves to
              // `accessibilityValue`, which TalkBack/VoiceOver announce
              // together ("Select Currency, AFN").
              accessibilityLabel={t("listing.form.selectCurrency")}
              accessibilityValue={{ text: currency }}
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                gap: 4,
                paddingHorizontal: 10,
              }}
            >
              <Coins size={14} color={colors.mutedForeground} />
              <Text className="text-sm font-semibold" style={{ marginHorizontal: 4 }}>
                {currency}
              </Text>
              {isRtl ? (
                <ChevronLeft size={12} color={colors.mutedForeground} />
              ) : (
                <ChevronRight size={12} color={colors.mutedForeground} />
              )}
            </Button>
          </View>
          {/* Distinguish "too high" from "not a valid price": showing
              priceRequired ("greater than 0") for an over-large number tells the
              seller the opposite of what is wrong. zod reports the max failure
              as issue code "too_big". */}
          {errors.price && (
            <FieldError
              message={t(
                errors.price.type === "too_big" ||
                  errors.price.type === "not_finite"
                  ? "listing.form.priceTooHigh"
                  : "listing.form.priceRequired"
              )}
            />
          )}

          {/* Negotiable toggle — placed inline below price so seller sees the pairing.
              Whole row is pressable, same as the quantity row below: the row is
              44pt tall and only the ~44x24 switch used to respond, so a tap on
              the label — the obvious target, and the platform convention for a
              settings row — did nothing (UI-012). The row owns the switch
              semantics so a screen reader announces the label once, not twice. */}
          <Controller
            control={control}
            name="negotiable"
            render={({ field }) => (
              <Pressable
                onPress={() => field.onChange(!field.value)}
                accessibilityRole="switch"
                accessibilityState={{ checked: !!field.value }}
                accessibilityLabel={t("listing.form.negotiableLabel")}
                testID="listing-form-negotiable-row"
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
                <Switch
                  // `?? true` mirrors the schema's own default. With the form
                  // typed on the INPUT side this field is boolean | undefined
                  // until the user touches it, and the Switch needs a concrete
                  // value — undefined would render it unchecked, i.e. showing
                  // "not negotiable" for a listing that will be saved as
                  // negotiable.
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                  testID="listing-form-negotiable-switch"
                />
              </Pressable>
            )}
          />

          {/* Multi-quantity — docs/SPIKE_LISTING_QUANTITY.md §0c.
              THE GOVERNING RULE: a seller with one item must never see this
              feature exist. So it is a single collapsed switch row, styled
              exactly like Negotiable above, and the number input only appears
              once they say they have several. No new section, no field to skip,
              no "1" to confirm.

              A numeric input rather than a stepper on purpose: the case this
              feature was asked for is 15 bags, and 14 taps on a "+" is worse
              than two keystrokes. */}
          <Pressable
            onPress={() => toggleMultipleUnits(!hasMultipleUnits)}
            accessibilityRole="switch"
            accessibilityState={{ checked: hasMultipleUnits }}
            accessibilityLabel={t("listing.form.multipleUnitsLabel")}
            testID="listing-form-quantity-row"
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 8,
              paddingHorizontal: 4,
              borderRadius: 8,
            }}
          >
            <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 8, flex: 1 }}>
              <Boxes size={16} color={colors.mutedForeground} />
              <Text className="text-sm" style={{ color: colors.foreground, textAlign: isRtl ? "right" : "left" }}>
                {t("listing.form.multipleUnitsLabel")}
              </Text>
            </View>
            {/* No accessibilityLabel here: the ROW above owns the switch
                semantics (role + checked state + label), so repeating it on the
                inner control makes a screen reader announce the same sentence
                twice and gives two elements the same label. testID stays — it is
                not an accessibility attribute, and a flow should be able to
                target the control itself. */}
            <Switch
              checked={hasMultipleUnits}
              onCheckedChange={toggleMultipleUnits}
              testID="listing-form-quantity-switch"
            />
          </Pressable>

          {hasMultipleUnits && (
            <Controller
              control={control}
              name="quantity"
              render={({ field }) => (
                <Input
                  value={String(field.value ?? "")}
                  onChangeText={(text) => {
                    const digits = normalizeDigits(text).replace(/[^0-9]/g, "");
                    field.onChange(digits === "" ? 1 : Number(digits));
                  }}
                  keyboardType="numeric"
                  placeholder="2"
                  // Same pre-fill hazard as the sold sheet (UI-008): the field
                  // arrives holding "2", so a tap only places a caret and typing
                  // 15 yields "215". Not destructive here — it is caught at
                  // review or by the 999 ceiling — but it is the same wrong
                  // behaviour, and a seller who meant 15 would publish 215.
                  selectTextOnFocus
                  // Its own label, not the switch's — a screen reader landing
                  // on a bare "2" otherwise hears the toggle's sentence twice
                  // and never learns what the number means.
                  accessibilityLabel={t("listing.form.howManyUnits")}
                  testID="listing-form-quantity-input"
                  error={!!errors.quantity}
                  style={{ marginTop: 4 }}
                />
              )}
            />
          )}

          {/* Quantity had NO inline error, which made the generic fallback lie.
              The ceiling is reachable in one keystroke: this field arrives holding
              "2" with selectTextOnFocus, so a seller who taps and types 500 gets
              2500, zod rejects it, and `quantity` is not in FIELD_ERROR_TO_BLOCKER
              — so the blocker list comes back EMPTY and the seller was told
              "Please check the highlighted fields before continuing" with nothing
              highlighted anywhere on the screen. Now the field says what is
              wrong and what the limit is. */}
          {errors.quantity && (
            <FieldError
              message={t("listing.form.quantityOutOfRange", {
                max: MAX_LISTING_QUANTITY,
              })}
            />
          )}
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* 4. Category                                                         */}
        {/* ------------------------------------------------------------------ */}
        <View style={styles.field} onLayout={registerSectionY("category")} testID="listing-form-field-category">
          <FieldLabel nativeID="category-label" required className="mb-1">
            {t("common.category")}
          </FieldLabel>
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
                accessibilityRole="button"
                // TASK-P736 (review fix, CR round 3, a11y) — the label was the
                // VALUE (the category name), so the field's own identity
                // ("Category") was never announced — a screen reader heard
                // "Electronics, button" with no idea which field that was.
                // Title/Price already wire `nativeID` + `aria-labelledby`
                // through `FieldLabel` for exactly this; Category now does
                // too, with the current selection moved to `accessibilityValue`.
                aria-labelledby="category-label"
                // TASK-P736 (review fix, a11y, iOS) — `aria-labelledby` maps
                // to RN's `accessibilityLabelledBy`, which only exists on
                // ANDROID; on iOS the prop is ignored entirely, so this
                // Pressable fell back to reading its child Text — the VALUE
                // again, then re-read the identical string from
                // `accessibilityValue` ("Electronics, Electronics, button"),
                // never announcing the field's identity on iOS at all.
                // `accessibilityLabel` is the cross-platform fallback that
                // fixes this on both — keep `aria-labelledby` too (harmless
                // on Android, matches the house pattern elsewhere).
                accessibilityLabel={t("common.category")}
                accessibilityValue={{
                  text: selectedCategory ? categoryName(selectedCategory) : t("listing.form.selectCategoryPlaceholder"),
                }}
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
                testID="listing-form-description-input"
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
          <FieldLabel nativeID="location-label" required className="mb-1">
            {t("common.location")}
          </FieldLabel>
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
            accessibilityRole="button"
            // TASK-P736 (review fix, CR round 3, a11y) — same fix as Category
            // above: the field's own identity ("Location") now comes from
            // `FieldLabel` via `aria-labelledby`, and the current value (or
            // the "tap to set" placeholder) moves to `accessibilityValue`.
            aria-labelledby="location-label"
            // TASK-P736 (review fix, a11y, iOS) — same cross-platform fix as
            // Category above: `aria-labelledby` alone never announces the
            // field's identity on iOS.
            accessibilityLabel={t("common.location")}
            accessibilityValue={{
              text: hasExactLocation ? mapLabel ?? t("listing.form.locationSet") : t("listing.form.tapToSetLocation"),
            }}
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
            {isRtl ? (
              <ChevronLeft size={16} color={colors.mutedForeground} />
            ) : (
              <ChevronRight size={16} color={colors.mutedForeground} />
            )}
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
        </>
        )}

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
          {/* TASK-P736 (review fix, RTL) — this title and the option labels
              below were the only user-facing Texts in this file with no
              explicit `textAlign`, and the option label is the risky one:
              it carries `flex: 1` inside a `row-reverse` row, so its text
              box spans the full sheet width and its content alignment was
              decided entirely by the ambient direction rather than the
              row's own mirroring. */}
          <Text
            className="text-lg font-semibold"
            style={{ color: colors.foreground, marginBottom: 4, paddingHorizontal: 16, textAlign: isRtl ? "right" : "left" }}
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
              testID={`listing-form-currency-${opt.value}`}
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
              <Text className="text-sm" style={{ color: colors.foreground, flex: 1, textAlign: isRtl ? "right" : "left" }}>
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
    // TASK-P736 (review fix, CR round 3) — `EmptyState` sizes itself with
    // `flex: 1`, which does nothing without a container that has a
    // resolved height to flex WITHIN. Without this, the not-found/retry
    // states above collapsed to content height and sat jammed under the
    // "Edit Listing" title instead of centering in the remaining space.
    flexGrow: 1,
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
    // TASK-P736 (review fix, CR round 3, library compliance) — 16 (was 20),
    // matching PhotosSection's source-picker sheet radius one tap away in
    // the same flow, so the two hand-rolled sheets read as one design
    // system instead of two until both fold into a shared <BottomSheet>
    // (DESIGN_SYSTEM.md §4, docs/REFACTOR_DUPLICATION.md R12/R13).
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    // TASK-P736 (review fix, NIT, dead code) — no static `paddingBottom`
    // here: the render always supplies one inline
    // (`Math.max(insets.bottom, 16) + 12`), which unconditionally overrides
    // any value set here — a second source of truth for the same number.
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
