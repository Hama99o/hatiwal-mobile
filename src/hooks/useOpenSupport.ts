/**
 * useOpenSupport — the ONE way into the user's Hatiwal Support thread, shared
 * by the pinned inbox row and the Profile "Contact support" row.
 *
 * Always calls POST /support_conversation rather than reusing a cached id: it
 * is idempotent, creates the thread on first use, and revives one the user
 * archived — so the same tap is correct forever. On failure (offline, 5xx) it
 * shows a toast WITH a Retry action instead of a dead tap: this is the button
 * someone presses because something is already wrong.
 */
import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { conversationsAPI } from "@/api/conversations";
import { toast } from "@/lib/toast";

export function useOpenSupport() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: () => conversationsAPI.openSupportConversation(),
    onSuccess: (conversation) => {
      // A newly created or revived thread must appear in the inbox on return.
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push(`/(main)/conversation/${conversation.id}` as never);
    },
  });

  const openSupport = useCallback(() => {
    if (mutation.isPending) return;
    mutation.mutate(undefined, {
      onError: () => {
        toast.error(t("chat.support.openError"), {
          action: { label: t("common.retry"), onClick: () => openSupport() },
        });
      },
    });
  }, [mutation, t]);

  return { openSupport, isOpening: mutation.isPending };
}
