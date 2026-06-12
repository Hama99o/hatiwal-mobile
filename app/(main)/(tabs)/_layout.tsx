import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="browse"       options={{ title: t("sidebar.browse") }} />
      <Tabs.Screen name="chat"         options={{ title: t("sidebar.chat") }} />
      <Tabs.Screen name="my-listings"  options={{ title: t("sidebar.myListings") }} />
      <Tabs.Screen name="profile"      options={{ title: t("sidebar.profile") }} />
    </Tabs>
  );
}
