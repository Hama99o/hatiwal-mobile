// src/screens/shared/Onboarding.tsx
//
// First-run onboarding welcome carousel (TASK-W924).
//
// Shown exactly once, only to a genuinely fresh install: no stored auth token
// AND the `hatiwal:onboarding-seen` flag not yet set (see Splash.tsx + the
// gating logic in @/utils/onboarding). Three slides:
//   1. Welcome + brand Logomark
//   2. Buyer / seller modes — one account, switch anytime
//   3. Safe in-person meetups — chat first, no online payments
//
// Skip or "Get started" on the last slide both mark onboarding as seen and
// land the user on Browse (guest browsing is always allowed — never a login
// wall, matching Splash's existing contract).

import { useCallback, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Carousel, { Pagination, type ICarouselInstance } from "react-native-reanimated-carousel";
import { useSharedValue } from "react-native-reanimated";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { markOnboardingSeen } from "@/utils/onboarding";
import {
  OnboardingSlide,
  ONBOARDING_SLIDE_KEYS,
} from "@/screens/shared/onboarding/OnboardingSlide";

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const carouselRef = useRef<ICarouselInstance>(null);
  const progress = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastSlide = activeIndex === ONBOARDING_SLIDE_KEYS.length - 1;

  const finishOnboarding = useCallback(async () => {
    await markOnboardingSeen();
    router.replace("/(main)/(tabs)/browse");
  }, [router]);

  const handlePrimaryPress = useCallback(() => {
    if (isLastSlide) {
      finishOnboarding();
    } else {
      carouselRef.current?.next();
    }
  }, [isLastSlide, finishOnboarding]);

  return (
    <ScreenContainer
      scrollable={false}
      padded={false}
      safeArea={["top", "bottom"]}
      accessible
      accessibilityLabel={t("onboarding.slides.welcome.title")}
    >
      {/* Top bar — language switcher + Skip, mirrored for RTL */}
      <View
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 8,
        }}
      >
        <LanguageSwitcher size="sm" />
        <Button
          variant="ghost"
          onPress={finishOnboarding}
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.skip")}
        >
          <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
            {t("onboarding.skip")}
          </Text>
        </Button>
      </View>

      {/* Slides */}
      <View style={{ flex: 1 }}>
        <Carousel
          ref={carouselRef}
          testID="onboarding-carousel"
          width={width}
          data={ONBOARDING_SLIDE_KEYS}
          loop={false}
          onProgressChange={progress}
          onSnapToItem={setActiveIndex}
          renderItem={({ item }) => <OnboardingSlide slideKey={item} />}
        />
      </View>

      {/* Page dots */}
      <Pagination.Basic
        progress={progress}
        data={ONBOARDING_SLIDE_KEYS}
        dotStyle={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.border,
        }}
        activeDotStyle={{ backgroundColor: colors.primary }}
        containerStyle={{ gap: 8, marginBottom: 24 }}
        onPress={(index) => carouselRef.current?.scrollTo({ index, animated: true })}
      />

      {/* Primary action */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        <Button onPress={handlePrimaryPress} accessibilityRole="button">
          <Text>{isLastSlide ? t("onboarding.getStarted") : t("onboarding.next")}</Text>
        </Button>
      </View>
    </ScreenContainer>
  );
}
