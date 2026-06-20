import ChatScreen from "@/screens/chat/Conversations";
import { GuestGuard } from "@/components/common/GuestGuard";

export default function ChatTab() {
  return (
    <GuestGuard returnTo="/(main)/(tabs)/chat">
      <ChatScreen />
    </GuestGuard>
  );
}
