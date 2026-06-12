import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";

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
  icon: IconComponent;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const colors = useColors();

  return (
    <View
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 64, gap: 16 }}
    >
      <View style={{ alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 32, backgroundColor: colors.muted, marginBottom: 8 }}>
        <Icon size={32} color={colors.mutedForeground} strokeWidth={1.5} />
      </View>

      <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "600", textAlign: "center" }}>
        {title}
      </Text>

      {description ? (
        <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
          {description}
        </Text>
      ) : null}

      {action ? (
        <Pressable
          onPress={action.onPress}
          android_ripple={{ color: colors.muted }}
          style={{ marginTop: 8, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 }}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text style={{ color: colors.primaryForeground, fontSize: 14, fontWeight: "600", textAlign: "center" }}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
