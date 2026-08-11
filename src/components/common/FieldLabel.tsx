import React from "react";
import { Label } from "@/components/reusables/label";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";

interface FieldLabelProps {
  /** The field's display name — already localized (call `t(...)` before passing it in). */
  children: React.ReactNode;
  /** Renders a destructive " *" after the label. */
  required?: boolean;
  /** Forwarded to the underlying RNR `Label` — pair with a field's `aria-labelledby`. */
  nativeID?: string;
  className?: string;
}

/**
 * FieldLabel — TASK-P736 (review fix, CR round 2).
 *
 * The ONE "required field" label treatment, mirroring why `FieldError` was
 * extracted in the first pass of this card: before this component existed,
 * the exact same `<Label>{t(...)}<Text style={{ color: colors.destructive }}>
 * {" "}*</Text></Label>` snippet was copy-pasted 6 times across
 * ListingForm.tsx (title/price/category/location) and PhotosSection.tsx
 * (empty state + photo strip) — any future tweak to the marker (spacing,
 * color, a11y) had to be repeated correctly in all 6 places. All 6 now
 * render through this single component.
 *
 * Also owns the a11y `nativeID` wiring in one place, so a caller only has
 * to thread ONE prop through to both this label and the field it describes
 * (via the field's own `aria-labelledby={nativeID}`), instead of hardcoding
 * the same string twice.
 */
export function FieldLabel({ children, required, nativeID, className }: FieldLabelProps) {
  const colors = useColors();
  return (
    <Label nativeID={nativeID} className={className}>
      {children}
      {required && <Text style={{ color: colors.destructive }}> *</Text>}
    </Label>
  );
}
