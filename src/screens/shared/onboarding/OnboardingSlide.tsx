// src/screens/shared/onboarding/OnboardingSlide.tsx
//
// A single slide of the first-run onboarding carousel. Fully self-contained —
// calls its own useTranslation/useLocalization/useColors, per the "large
// screens" split-file rule (mobile.prompt.md §16).

import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, Handshake } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Logomark } from "@/components/common/Logomark";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

export type OnboardingSlideKey = "welcome" | "modes" | "meetups";

export const ONBOARDING_SLIDE_KEYS: OnboardingSlideKey[] = ["welcome", "modes", "meetups"];

interface OnboardingSlideProps {
  slideKey: OnboardingSlideKey;
}

export function OnboardingSlide({ slideKey }: OnboardingSlideProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        gap: 32,
      }}
    >
      <SlideIllustration slideKey={slideKey} />

      <View style={{ alignItems: "center", gap: 12 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            textAlign: "center",
            color: colors.foreground,
          }}
        >
          {t(`onboarding.slides.${slideKey}.title`)}
        </Text>
        <Text
          style={{
            fontSize: 15,
            textAlign: "center",
            lineHeight: 22,
            color: colors.mutedForeground,
            writingDirection: isRtl ? "rtl" : "ltr",
          }}
        >
          {t(`onboarding.slides.${slideKey}.description`)}
        </Text>
      </View>
    </View>
  );
}

function SlideIllustration({ slideKey }: { slideKey: OnboardingSlideKey }) {
  const colors = useColors();

  if (slideKey === "welcome") {
    return <Logomark size={120} />;
  }

  const Icon = slideKey === "modes" ? ArrowLeftRight : Handshake;

  return (
    <View
      style={{
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primaryAlpha,
      }}
    >
      <Icon size={56} color={colors.primary} />
    </View>
  );
}
