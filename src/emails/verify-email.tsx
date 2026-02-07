import { Button, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface VerifyEmailProps {
  url: string;
}

export function VerifyEmail({ url }: VerifyEmailProps) {
  return (
    <BaseLayout preview="Verify your Sparebox email address">
      <Text style={{ fontSize: "20px", fontWeight: "600", color: "#1C1917", marginBottom: "16px" }}>
        Verify your email
      </Text>
      <Text style={{ color: "#78716C", lineHeight: "1.6", fontSize: "14px" }}>
        Welcome to Sparebox! Click the button below to verify your email address.
      </Text>
      <Button
        href={url}
        style={{ backgroundColor: "#C2410C", color: "#ffffff", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: "500", display: "inline-block", margin: "24px 0", fontSize: "14px" }}
      >
        Verify Email
      </Button>
      <Text style={{ color: "#A8A29E", fontSize: "13px", lineHeight: "1.6" }}>
        If you didn&apos;t create a Sparebox account, you can safely ignore this email.
      </Text>
    </BaseLayout>
  );
}
