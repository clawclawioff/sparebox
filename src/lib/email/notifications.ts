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
// Host Approved
// =============================================================================

interface HostApprovedParams {
  hostName: string;
  hostId: string;
}

export async function sendHostApprovedEmail(to: string, params: HostApprovedParams) {
  const resend = getResend();
  if (!resend) return;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="font-size: 24px; font-weight: 700; color: #111; margin-bottom: 16px;">Your host has been approved! ✅</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
        Great news — <strong>${params.hostName}</strong> has been approved and is now active on Sparebox.
        Deployers can now browse and deploy agents to your machine.
      </p>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Make sure your daemon is running so your host stays online and receives deployments.
      </p>
      <a href="https://www.sparebox.dev/dashboard/hosts/${params.hostId}" 
         style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        View Host Dashboard
      </a>
      <p style="color: #999; font-size: 13px; margin-top: 32px;">— Sparebox</p>
    </div>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your host ${params.hostName} has been approved! ✅`,
    html,
  });
  console.info(`[email] Host approved email sent to ${to} for host ${params.hostId}`);
}

// =============================================================================
// Host Rejected
// =============================================================================

interface HostRejectedParams {
  hostName: string;
  reason?: string;
}

export async function sendHostRejectedEmail(to: string, params: HostRejectedParams) {
  const resend = getResend();
  if (!resend) return;

  const reasonBlock = params.reason
    ? `<p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 16px;"><strong>Reason:</strong> ${params.reason}</p>`
    : "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="font-size: 24px; font-weight: 700; color: #111; margin-bottom: 16px;">Host registration update</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
        Unfortunately, <strong>${params.hostName}</strong> was not approved for Sparebox at this time.
      </p>
      ${reasonBlock}
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        If you believe this was a mistake or have questions, please reach out to our support team.
      </p>
      <p style="color: #999; font-size: 13px; margin-top: 32px;">— Sparebox</p>
    </div>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Update on your host ${params.hostName}`,
    html,
  });
  console.info(`[email] Host rejected email sent to ${to}`);
}

// =============================================================================
// New Host Pending (notify admin)
// =============================================================================

interface NewHostPendingParams {
  hostName: string;
  hostId: string;
  ownerEmail: string;
  ownerName: string | null;
}

export async function sendNewHostPendingEmail(to: string, params: NewHostPendingParams) {
  const resend = getResend();
  if (!resend) return;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="font-size: 24px; font-weight: 700; color: #111; margin-bottom: 16px;">New host registration 🖥️</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
        A new host needs your approval:
      </p>
      <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 4px 0; color: #333;"><strong>Host:</strong> ${params.hostName}</p>
        <p style="margin: 4px 0; color: #333;"><strong>Owner:</strong> ${params.ownerName || params.ownerEmail}</p>
        <p style="margin: 4px 0; color: #333;"><strong>Email:</strong> ${params.ownerEmail}</p>
      </div>
      <a href="https://www.sparebox.dev/dashboard/admin" 
         style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Review in Admin Dashboard
      </a>
      <p style="color: #999; font-size: 13px; margin-top: 32px;">— Sparebox</p>
    </div>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New host pending approval: ${params.hostName}`,
    html,
  });
  console.info(`[email] New host pending email sent to admin`);
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
