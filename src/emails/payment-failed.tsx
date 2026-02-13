import { Button, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface PaymentFailedProps {
  agentName: string;
  nextRetryDate: string;
  hostedInvoiceUrl: string;
}

export function PaymentFailed({ agentName, nextRetryDate, hostedInvoiceUrl }: PaymentFailedProps) {
  return (
    <BaseLayout preview={`Payment failed for your agent "${agentName}"`}>
      <Text style={{ fontSize: "20px", fontWeight: "600", color: "#1C1917", marginBottom: "16px" }}>
        Payment failed
      </Text>
      <Text style={{ color: "#78716C", lineHeight: "1.6", fontSize: "14px" }}>
        We were unable to process the payment for your agent <strong style={{ color: "#1C1917" }}>{agentName}</strong>.
      </Text>
      <Text style={{ color: "#78716C", lineHeight: "1.6", fontSize: "14px" }}>
        Don&apos;t worry — your agent will <strong style={{ color: "#1C1917" }}>keep running for 3 days</strong> while we
        retry the charge. Please update your payment method to avoid any interruption.
      </Text>
      {nextRetryDate && (
        <Text style={{ color: "#78716C", lineHeight: "1.6", fontSize: "14px" }}>
          We&apos;ll automatically retry on <strong style={{ color: "#1C1917" }}>{nextRetryDate}</strong>.
        </Text>
      )}
      <Button
        href={hostedInvoiceUrl}
        style={{ backgroundColor: "#C2410C", color: "#ffffff", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: "500", display: "inline-block", margin: "24px 0", fontSize: "14px" }}
      >
        Update Payment Method
      </Button>
      <Text style={{ color: "#A8A29E", fontSize: "13px", lineHeight: "1.6" }}>
        If you believe this is an error, check with your bank or try a different payment method.
      </Text>
    </BaseLayout>
  );
}
