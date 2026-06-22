import { Stack } from "expo-router";
import { useReduceMotion } from "@/lib/animation/useReduceMotion";

export default function AuthLayout() {
  const reduceMotion = useReduceMotion();
  const stackAnimation = reduceMotion ? "none" : "slide_from_right";

  return (
    <Stack screenOptions={{ headerShown: false, animation: stackAnimation }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
