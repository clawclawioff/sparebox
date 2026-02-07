import { Button, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface ResetPasswordProps {
  url: string;
}

export function ResetPassword({ url }: ResetPasswordProps) {
  return (
    <BaseLayout preview="Reset your Sparebox password">
      <Text style={{ fontSize: "20px", fontWeight: "600", color: "#1C1917", marginBottom: "16px" }}>
        Reset your password
      </Text>
      <Text style={{ color: "#78716C", lineHeight: "1.6", fontSize: "14px" }}>
        We received a request to reset your password. Click the button below to choose a new one.
      </Text>
      <Button
        href={url}
        style={{ backgroundColor: "#C2410C", color: "#ffffff", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: "500", display: "inline-block", margin: "24px 0", fontSize: "14px" }}
      >
        Reset Password
      </Button>
      <Text style={{ color: "#A8A29E", fontSize: "13px", lineHeight: "1.6" }}>
        If you didn&apos;t request this, you can safely ignore this email. This link expires in 1 hour.
      </Text>
    </BaseLayout>
  );
}
