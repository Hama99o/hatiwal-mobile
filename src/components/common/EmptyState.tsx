import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { cn } from "@/lib/utils";

interface LucideIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

type IconComponent = React.ComponentType<LucideIconProps>;

interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  /** Lucide icon component e.g. ShoppingBag from lucide-react-native */
  icon: IconComponent;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

/**
 * EmptyState — Lucide icon + title + optional guidance + optional primary Button.
 * Compose with RNR Button when you have one; for now uses Pressable
 * styled identically to the primary button token.
 * RTL-safe: text alignment driven by the active locale via I18nManager.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const colors = useColors();

  return (
    <View
      className={cn(
        "flex-1 items-center justify-center px-8 py-16 gap-4",
        className
      )}
      accessibilityRole="none"
    >
      <View className="items-center justify-center w-16 h-16 rounded-full bg-muted mb-2">
        <Icon size={32} color={colors.mutedForeground} strokeWidth={1.5} />
      </View>

      <Text className="text-lg font-semibold text-foreground text-center">
        {title}
      </Text>

      {description ? (
        <Text className="text-sm text-muted-foreground text-center leading-5">
          {description}
        </Text>
      ) : null}

      {action ? (
        <Pressable
          onPress={action.onPress}
          android_ripple={{ color: colors.muted }}
          className="mt-2 bg-primary rounded-md px-6 py-3 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text className="text-primary-foreground text-sm font-semibold text-center">
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
