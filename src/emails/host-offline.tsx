import { Button, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface HostOfflineProps {
  hostName: string;
  lastSeen: string;
  hostId: string;
}

export function HostOffline({ hostName, lastSeen, hostId }: HostOfflineProps) {
  const dashboardUrl = `https://www.sparebox.dev/dashboard/machines/${hostId}`;

  return (
    <BaseLayout preview={`Your machine "${hostName}" appears to be offline`}>
      <Text style={{ fontSize: "20px", fontWeight: "600", color: "#1C1917", marginBottom: "16px" }}>
        Your machine appears to be offline
      </Text>
      <Text style={{ color: "#78716C", lineHeight: "1.6", fontSize: "14px" }}>
        We haven&apos;t received a heartbeat from <strong style={{ color: "#1C1917" }}>{hostName}</strong> since{" "}
        <strong style={{ color: "#1C1917" }}>{lastSeen}</strong>. This means any agents running on it may be unreachable.
      </Text>
      <Text style={{ fontSize: "14px", fontWeight: "600", color: "#1C1917", marginTop: "24px", marginBottom: "8px" }}>
        Troubleshooting tips:
      </Text>
      <Text style={{ color: "#78716C", lineHeight: "1.8", fontSize: "14px", paddingLeft: "8px" }}>
        • Check that the Sparebox daemon is running on the machine{"\n"}
        • Verify the machine has an active network connection{"\n"}
        • Restart the daemon: <code style={{ backgroundColor: "#F5F5F4", padding: "2px 6px", borderRadius: "4px", fontSize: "13px" }}>sparebox-daemon start</code>{"\n"}
        • Check firewall rules aren&apos;t blocking outbound HTTPS
      </Text>
      <Button
        href={dashboardUrl}
        style={{ backgroundColor: "#C2410C", color: "#ffffff", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: "500", display: "inline-block", margin: "24px 0", fontSize: "14px" }}
      >
        Check Machine Status
      </Button>
      <Text style={{ color: "#A8A29E", fontSize: "13px", lineHeight: "1.6" }}>
        Once the daemon reconnects, your machine will automatically return to active status.
      </Text>
    </BaseLayout>
  );
}
