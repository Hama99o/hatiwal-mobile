import { Alert } from "react-native";

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
  Alert.alert(title, message, buttons);
}
