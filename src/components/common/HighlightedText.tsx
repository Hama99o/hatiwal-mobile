import type { StyleProp, TextStyle } from "react-native";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";

interface HighlightedTextProps {
  /** The full text to render. */
  text: string;
  /** Active search term — matching substrings are highlighted. Falsy/blank → plain text. */
  query?: string;
  /** Base style applied to every segment (matched and unmatched alike). */
  baseStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * HighlightedText (TASK-J471) — shared "why did this match?" highlighter.
 *
 * Extracted verbatim from `MessageBubble`'s previously-private
 * implementation (in-thread message search, TASK-N803) so the same visual
 * treatment can be reused by `ConversationRow`'s inbox preview line
 * (list-level search, TASK-Z684) instead of a second hand-rolled copy.
 * Zero behavioural change from the original: regex-escaped, case-insensitive
 * split on `query`, `.trim()`'d internally so this can never disagree with
 * whatever filter/search predicate already selected the row/message on
 * whitespace handling (both `filterConversations` and the in-thread filter
 * trim their term too) — `colors.warningAlpha` background + `colors.warning`
 * foreground + 700 weight on every matched segment.
 *
 * Known gap (non-behavioural, tracked as a follow-up): `filterConversations`
 * also runs both the needle and haystack through `normalizeDigits` (Latin ↔
 * Eastern-Arabic/Persian numerals) before matching, so a Latin-digit search
 * term correctly SELECTS a row whose preview renders Eastern-Arabic digits
 * (ps/fa `formatCurrency` output) — but this component matches on the raw,
 * un-normalized string, so that row's matched amount won't actually get
 * highlighted. Matching-on-normalized-then-mapping-back-to-original-offsets
 * would change this component's matching behaviour, which is explicitly out
 * of scope for this verbatim extraction.
 */
export function HighlightedText({ text, query, baseStyle, numberOfLines }: HighlightedTextProps) {
  const colors = useColors();

  // Trim so that leading/trailing whitespace in the query never causes a mismatch
  // between what the filter selected (uses .trim()) and what we highlight here.
  const trimmedQuery = (query ?? "").trim();
  if (!trimmedQuery) {
    return (
      <Text style={baseStyle} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <Text style={baseStyle} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === trimmedQuery.toLowerCase();
        if (isMatch) {
          return (
            <Text
              key={index}
              style={[
                baseStyle,
                {
                  backgroundColor: colors.warningAlpha,
                  borderRadius: 3,
                  // Use warning color for highlighted text so it's readable on both themes
                  color: colors.warning,
                  fontWeight: "700",
                },
              ]}
            >
              {part}
            </Text>
          );
        }
        return (
          <Text key={index} style={baseStyle}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
}
