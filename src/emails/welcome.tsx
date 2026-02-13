import { Button, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface WelcomeProps {
  userName: string;
  role: "host" | "deployer" | "default";
}

export function Welcome({ userName, role }: WelcomeProps) {
  const displayName = userName || "there";

  const roleContent = {
    deployer: {
      message: "You're all set to deploy AI agents on real hardware. Browse available host machines, pick one that fits your needs, and have your agent running in minutes.",
      cta: "Browse Available Hosts",
      ctaUrl: "https://www.sparebox.dev/dashboard/deploy",
    },
    host: {
      message: "You're ready to start earning by sharing your machine's computing power. Register your machine, install the Sparebox daemon, and start hosting AI agents.",
      cta: "Register Your Machine",
      ctaUrl: "https://www.sparebox.dev/dashboard/machines",
    },
    default: {
      message: "Sparebox connects AI agent deployers with people who have spare computing power. Whether you want to deploy agents or earn by hosting them, we've got you covered.",
      cta: "Go to Dashboard",
      ctaUrl: "https://www.sparebox.dev/dashboard",
    },
  };

  const content = roleContent[role] || roleContent.default;

  return (
    <BaseLayout preview="Welcome to Sparebox — your hardware, their agents, everyone wins">
      <Text style={{ fontSize: "20px", fontWeight: "600", color: "#1C1917", marginBottom: "16px" }}>
        Welcome to Sparebox! 🦞
      </Text>
      <Text style={{ color: "#78716C", lineHeight: "1.6", fontSize: "14px" }}>
        Hey {displayName}, thanks for joining! Your email is verified and your account is ready to go.
      </Text>
      <Text style={{ color: "#78716C", lineHeight: "1.6", fontSize: "14px" }}>
        {content.message}
      </Text>
      <Button
        href={content.ctaUrl}
        style={{ backgroundColor: "#C2410C", color: "#ffffff", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: "500", display: "inline-block", margin: "24px 0", fontSize: "14px" }}
      >
        {content.cta}
      </Button>
      <Text style={{ color: "#A8A29E", fontSize: "13px", lineHeight: "1.6" }}>
        Questions? Just reply to this email — we&apos;re happy to help.
      </Text>
    </BaseLayout>
  );
}
