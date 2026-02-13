import { Resend } from "resend";
import { render } from "@react-email/render";
import { DeploySuccess } from "@/emails/deploy-success";
import { HostOffline } from "@/emails/host-offline";
import { PaymentFailed } from "@/emails/payment-failed";
import { Welcome } from "@/emails/welcome";

const FROM_EMAIL = "Sparebox <noreply@sparebox.dev>";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — email will not be sent");
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

// =============================================================================
// Deploy Success
// =============================================================================

interface DeploySuccessParams {
  agentName: string;
  hostName: string;
  hostRegion: string;
  price: number; // cents
  agentId: string;
}

export async function sendDeploySuccessEmail(to: string, params: DeploySuccessParams) {
  const resend = getResend();
  if (!resend) return;

  const priceStr = `$${(params.price / 100).toFixed(2)}/mo`;
  const html = await render(
    DeploySuccess({
      agentName: params.agentName,
      hostName: params.hostName,
      hostRegion: params.hostRegion || "Unknown",
      price: priceStr,
      agentId: params.agentId,
    })
  );

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Your agent is live! 🚀",
    html,
  });
  console.info(`[email] Deploy success email sent to ${to} for agent ${params.agentId}`);
}

// =============================================================================
// Host Offline
// =============================================================================

interface HostOfflineParams {
  hostName: string;
  lastSeen: Date;
  hostId: string;
}

export async function sendHostOfflineEmail(to: string, params: HostOfflineParams) {
  const resend = getResend();
  if (!resend) return;

  const lastSeenStr = params.lastSeen.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  const html = await render(
    HostOffline({
      hostName: params.hostName,
      lastSeen: `${lastSeenStr} UTC`,
      hostId: params.hostId,
    })
  );

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your machine ${params.hostName} appears to be offline`,
    html,
  });
  console.info(`[email] Host offline email sent to ${to} for host ${params.hostId}`);
}

// =============================================================================
// Payment Failed
// =============================================================================

interface PaymentFailedParams {
  agentName: string;
  nextRetryDate: Date | null;
  hostedInvoiceUrl: string;
}

export async function sendPaymentFailedEmail(to: string, params: PaymentFailedParams) {
  const resend = getResend();
  if (!resend) return;

  const nextRetryStr = params.nextRetryDate
    ? params.nextRetryDate.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      })
    : "";

  const html = await render(
    PaymentFailed({
      agentName: params.agentName,
      nextRetryDate: nextRetryStr,
      hostedInvoiceUrl: params.hostedInvoiceUrl || "https://www.sparebox.dev/dashboard/billing",
    })
  );

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Payment failed for your agent ${params.agentName}`,
    html,
  });
  console.info(`[email] Payment failed email sent to ${to} for agent ${params.agentName}`);
}

// =============================================================================
// Welcome
// =============================================================================

interface WelcomeParams {
  userName: string;
  role: "host" | "deployer" | "default";
}

export async function sendWelcomeEmail(to: string, params: WelcomeParams) {
  const resend = getResend();
  if (!resend) return;

  const html = await render(
    Welcome({
      userName: params.userName,
      role: params.role,
    })
  );

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to Sparebox! 🦞",
    html,
  });
  console.info(`[email] Welcome email sent to ${to}`);
}
