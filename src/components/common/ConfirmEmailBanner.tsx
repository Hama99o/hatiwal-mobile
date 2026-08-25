import { useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { MailWarning } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { authAPI } from "@/api/auth";
import { toast } from "@/lib/toast";

/**
 * "Confirm your email", with a resend action.
 *
 * WHY THIS EXISTS. `:confirmable` has been switched on in the API for a while, but
 * nothing was ever gated on it because neither client could tell a confirmed
 * account from an unconfirmed one, and neither had a way to ask for the email
 * again (docs/EMAIL_CONFIRMATION.md). Until both exist, an account that never
 * confirms is invisible to the user and the ban deterrent stays inactive — someone
 * suspended returns with a fake address and simply never confirms it.
 *
 * NON-BLOCKING, deliberately, matching the API: `allow_unconfirmed_access_for` is
 * nil there, so an unconfirmed user keeps full access. This informs and offers a
 * resend; it does not stand in anyone's way. Gating comes later, and only once
 * this prompt has actually shipped.
 */
export function ConfirmEmailBanner({ email, confirmed }: {
  email?: string | null;
  /** Undefined on an older API build — treated as confirmed, so the prompt never
   *  appears for someone who has no way to act on it. */
  confirmed?: boolean;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();
  const [sending, setSending] = useState(false);

  if (confirmed !== false || !email) return null;

  const resend = async () => {
    if (sending) return;
    setSending(true);
    try {
      await authAPI.resendConfirmation(email);
      toast.success(t("auth.confirmEmail.sent"));
    } catch {
      toast.error(t("auth.confirmEmail.failed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <View
      testID="confirm-email-banner"
      style={{
        backgroundColor: colors.warningAlpha,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        gap: 10,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
        <MailWarning size={18} color={colors.foreground} />
        <Text
          className="text-sm font-semibold"
          style={{ color: colors.foreground, flex: 1, textAlign: isRtl ? "right" : "left" }}
        >
          {t("auth.confirmEmail.title")}
        </Text>
      </View>

      <Text
        className="text-xs"
        style={{ color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" }}
      >
        {t("auth.confirmEmail.body", { email })}
      </Text>

      <Button
        variant="outline"
        testID="confirm-email-resend"
        onPress={resend}
        disabled={sending}
        style={{ alignSelf: isRtl ? "flex-end" : "flex-start", paddingHorizontal: 16, minHeight: 40 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text className="text-sm font-medium">
            {sending ? t("auth.confirmEmail.sending") : t("auth.confirmEmail.resend")}
          </Text>
          {sending && <ActivityIndicator size="small" color={colors.foreground} />}
        </View>
      </Button>
    </View>
  );
}

export default ConfirmEmailBanner;
