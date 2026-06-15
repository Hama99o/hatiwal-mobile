import React from "react";
import { View } from "react-native";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
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
        <Button
          variant="default"
          size="default"
          onPress={action.onPress}
          style={{ marginTop: 8, paddingHorizontal: 24 }}
          accessibilityLabel={action.label}
        >
          <Text style={{ fontSize: 14, fontWeight: "600" }}>
            {action.label}
          </Text>
        </Button>
      ) : null}
    </View>
  );
}
