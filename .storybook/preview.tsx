import React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Initialize i18n so useTranslation() works in stories
import "../src/i18n";

import type { Preview } from "@storybook/react-native";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const preview: Preview = {
  decorators: [
    (Story) => (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <View style={{ flex: 1, padding: 16, backgroundColor: "#f8f9fa" }}>
            <Story />
          </View>
        </QueryClientProvider>
      </GestureHandlerRootView>
    ),
  ],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /date$/ } },
  },
};

export default preview;
