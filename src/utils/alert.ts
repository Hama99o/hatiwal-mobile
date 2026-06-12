import { Alert, Platform } from "react-native";

type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

export function confirmAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void {
  if (Platform.OS === "web") {
    // On web, Alert.alert is a no-op — use a simple confirm fallback
    // For a proper web dialog, wire up a global ConfirmHost component
    const confirmed = window.confirm(
      message ? `${title}\n\n${message}` : title
    );
    if (confirmed) {
      const confirmButton = buttons?.find(
        (b) => b.style !== "cancel" && b.onPress
      );
      confirmButton?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}
