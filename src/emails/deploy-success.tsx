import { Button, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface DeploySuccessProps {
  agentName: string;
  hostName: string;
  hostRegion: string;
  price: string;
  agentId: string;
}

export function DeploySuccess({ agentName, hostName, hostRegion, price, agentId }: DeploySuccessProps) {
  const dashboardUrl = `https://www.sparebox.dev/dashboard/agents/${agentId}`;

  return (
    <BaseLayout preview={`Your agent "${agentName}" is live on Sparebox!`}>
      <Text style={{ fontSize: "20px", fontWeight: "600", color: "#1C1917", marginBottom: "16px" }}>
        Your agent is live! 🚀
      </Text>
      <Text style={{ color: "#78716C", lineHeight: "1.6", fontSize: "14px" }}>
        Great news — your agent has been deployed and is ready to go.
      </Text>
      <table style={{ width: "100%", borderCollapse: "collapse", margin: "24px 0" }}>
        <tbody>
          <tr>
            <td style={{ padding: "8px 0", color: "#A8A29E", fontSize: "13px", width: "120px" }}>Agent</td>
            <td style={{ padding: "8px 0", color: "#1C1917", fontSize: "14px", fontWeight: "500" }}>{agentName}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", color: "#A8A29E", fontSize: "13px" }}>Host</td>
            <td style={{ padding: "8px 0", color: "#1C1917", fontSize: "14px", fontWeight: "500" }}>{hostName}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", color: "#A8A29E", fontSize: "13px" }}>Region</td>
            <td style={{ padding: "8px 0", color: "#1C1917", fontSize: "14px", fontWeight: "500" }}>{hostRegion}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", color: "#A8A29E", fontSize: "13px" }}>Monthly price</td>
            <td style={{ padding: "8px 0", color: "#1C1917", fontSize: "14px", fontWeight: "500" }}>{price}</td>
          </tr>
        </tbody>
      </table>
      <Button
        href={dashboardUrl}
        style={{ backgroundColor: "#C2410C", color: "#ffffff", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: "500", display: "inline-block", margin: "24px 0", fontSize: "14px" }}
      >
        View Your Agent
      </Button>
      <Text style={{ color: "#A8A29E", fontSize: "13px", lineHeight: "1.6" }}>
        Your agent status will update to &quot;running&quot; once the host machine picks it up. This usually takes under a minute.
      </Text>
    </BaseLayout>
  );
}
