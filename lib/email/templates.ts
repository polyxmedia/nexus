const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nexushq.xyz";

// ── Brand tokens ──
// Dark mode mirrors the site: navy-950 bg, navy borders, light text
// Light mode: clean white bg, black buttons, neutral grays

const DARK = {
  bg: "#000000",
  card: "#0a0a0a",
  border: "#1f1f1f",
  text: "#e0e0e0",
  muted: "#787878",
  accent: "#06b6d4",    // cyan for dark mode links/accents
  btnBg: "#e0e0e0",
  btnText: "#000000",
  label: "#787878",     // mono labels in muted gray, not blue
};

const LIGHT = {
  bg: "#f5f5f5",
  card: "#ffffff",
  border: "#e0e0e0",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  accent: "#0a0a0a",    // near-black for light mode accents
  btnBg: "#0a0a0a",
  btnText: "#ffffff",
  label: "#6b6b6b",     // neutral gray labels
};

// Email clients that support prefers-color-scheme: Apple Mail, iOS Mail, Outlook macOS, some webmails.
// For clients that don't, the dark fallback renders (since dark is the inline default).
function layout(content: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  :root { color-scheme: light dark; }
  @media (prefers-color-scheme: light) {
    .email-body { background-color: ${LIGHT.bg} !important; }
    .email-card { background-color: ${LIGHT.card} !important; border-color: ${LIGHT.border} !important; }
    .email-heading { color: ${LIGHT.text} !important; }
    .email-text { color: ${LIGHT.text} !important; }
    .email-muted { color: ${LIGHT.muted} !important; }
    .email-label { color: ${LIGHT.label} !important; }
    .email-btn { background-color: ${LIGHT.btnBg} !important; color: ${LIGHT.btnText} !important; }
    .email-metric-cell { border-color: ${LIGHT.border} !important; }
    .email-metric-value { color: ${LIGHT.text} !important; }
    .email-footer { border-color: ${LIGHT.border} !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${DARK.bg};font-family:'IBM Plex Sans',-apple-system,sans-serif;">
<table class="email-body" width="100%" cellpadding="0" cellspacing="0" style="background:${DARK.bg};padding:40px 20px;">
<tr><td align="center">
<table class="email-card" width="560" cellpadding="0" cellspacing="0" style="background:${DARK.card};border:1px solid ${DARK.border};border-radius:8px;">
  <tr><td style="padding:32px 40px 24px;">
    <div class="email-label" style="font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:${DARK.label};margin-bottom:24px;">Nexus Intelligence</div>
    ${content}
  </td></tr>
  <tr><td class="email-footer" style="padding:16px 40px 24px;border-top:1px solid ${DARK.border};">
    <div class="email-muted" style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:${DARK.muted};letter-spacing:1px;">
      Nexus Intelligence Platform
    </div>
    <div style="margin-top:8px;">
      <a href="${SITE_URL}/settings" class="email-muted" style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:${DARK.muted};letter-spacing:1px;text-decoration:underline;">
        To manage your email preferences, visit your account settings.
      </a>
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function heading(text: string) {
  return `<h1 class="email-heading" style="font-size:20px;font-weight:600;color:${DARK.text};margin:0 0 16px;">${text}</h1>`;
}

function paragraph(text: string) {
  return `<p class="email-text" style="font-size:14px;line-height:1.6;color:${DARK.text};margin:0 0 16px;">${text}</p>`;
}

function mutedText(text: string) {
  return `<p class="email-muted" style="font-size:12px;line-height:1.5;color:${DARK.muted};margin:0 0 12px;">${text}</p>`;
}

function button(text: string, url: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td>
    <a href="${url}" class="email-btn" style="display:inline-block;padding:10px 24px;background:${DARK.btnBg};color:${DARK.btnText};font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:1px;text-decoration:none;border-radius:4px;">
      ${text}
    </a>
  </td></tr></table>`;
}

function metricRow(items: { label: string; value: string }[]) {
  const cells = items
    .map(
      (item) =>
        `<td class="email-metric-cell" style="padding:12px 16px;border:1px solid ${DARK.border};border-radius:4px;">
          <div class="email-label" style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:1px;color:${DARK.label};margin-bottom:4px;">${item.label}</div>
          <div class="email-metric-value" style="font-family:'IBM Plex Mono',monospace;font-size:16px;font-weight:700;color:${DARK.text};">${item.value}</div>
        </td>`
    )
    .join('<td width="12"></td>');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr>${cells}</tr></table>`;
}

// ── Templates ──

export function welcomeEmail(username: string, loginUrl: string) {
  return {
    subject: "Welcome to Nexus Intelligence",
    html: layout(
      heading("Welcome to Nexus") +
        paragraph(`Your account <strong>${username}</strong> is ready. You now have access to multi-layer signal detection, AI-driven analysis, and market convergence tracking.`) +
        button("Open Nexus", loginUrl) +
        mutedText("If you did not create this account, you can safely ignore this email.")
    ),
  };
}

export function subscriptionActiveEmail(username: string, tierName: string, dashboardUrl: string) {
  return {
    subject: `Nexus ${tierName} subscription active`,
    html: layout(
      heading("Subscription Confirmed") +
        paragraph(`Your <strong>${tierName}</strong> subscription is now active.`) +
        metricRow([
          { label: "Account", value: username },
          { label: "Tier", value: tierName },
          { label: "Status", value: "Active" },
        ]) +
        button("Go to Dashboard", dashboardUrl) +
        mutedText("Manage your subscription anytime from Settings.")
    ),
  };
}

export function subscriptionCanceledEmail(username: string) {
  return {
    subject: "Nexus subscription canceled",
    html: layout(
      heading("Subscription Canceled") +
        paragraph(`Your subscription has been canceled. You'll retain access until the end of your current billing period.`) +
        mutedText(`Account: ${username}`)
    ),
  };
}

export function trialEndingEmail(username: string, tierName: string, settingsUrl: string) {
  return {
    subject: "Your Nexus trial ends tomorrow",
    html: layout(
      heading("Trial Ending Soon") +
        paragraph(`Your 2-day free trial of <strong>${tierName}</strong> ends tomorrow. After that, your card on file will be charged automatically.`) +
        paragraph("If you'd like to keep access, you don't need to do anything. To cancel before you're charged, visit your settings.") +
        button("Manage Subscription", settingsUrl) +
        mutedText(`Account: ${username}`)
    ),
  };
}

export function subscriptionPausedEmail(username: string) {
  return {
    subject: "Nexus subscription paused",
    html: layout(
      heading("Subscription Paused") +
        paragraph("Your subscription has been paused. You won't be charged while paused, but platform access is restricted.") +
        mutedText(`Account: ${username}. Resume anytime from Settings.`)
    ),
  };
}

export function subscriptionResumedEmail(username: string, tierName: string, dashboardUrl: string) {
  return {
    subject: `Nexus ${tierName} subscription resumed`,
    html: layout(
      heading("Welcome Back") +
        paragraph(`Your <strong>${tierName}</strong> subscription is active again. Full access has been restored.`) +
        button("Go to Dashboard", dashboardUrl) +
        mutedText(`Account: ${username}`)
    ),
  };
}

export function paymentFailedEmail(username: string, settingsUrl: string) {
  return {
    subject: "Nexus payment failed",
    html: layout(
      heading("Payment Failed") +
        paragraph("We were unable to process your latest payment. Please update your billing information to maintain access.") +
        button("Update Billing", settingsUrl) +
        mutedText(`Account: ${username}`)
    ),
  };
}

export function ticketOpenedEmail(username: string, ticketId: number, title: string, ticketUrl: string) {
  return {
    subject: `Nexus support ticket #${ticketId} received`,
    html: layout(
      heading("Ticket Received") +
        paragraph(`We've received your support request and will get back to you shortly.`) +
        metricRow([
          { label: "Ticket", value: `#${ticketId}` },
          { label: "Subject", value: title.length > 30 ? title.slice(0, 30) + "..." : title },
          { label: "Status", value: "Open" },
        ]) +
        button("View Ticket", ticketUrl) +
        mutedText(`Account: ${username}`)
    ),
  };
}

export function ticketReplyEmail(username: string, ticketId: number, title: string, replyPreview: string, ticketUrl: string) {
  const preview = replyPreview.length > 200 ? replyPreview.slice(0, 200) + "..." : replyPreview;
  return {
    subject: `Re: Nexus support ticket #${ticketId}`,
    html: layout(
      heading("New Reply on Your Ticket") +
        paragraph(`Our team has responded to your support request <strong>#${ticketId}</strong>.`) +
        `<div style="padding:16px;background:${DARK.bg};border:1px solid ${DARK.border};border-radius:4px;margin:16px 0;">
          <p class="email-text" style="font-size:13px;line-height:1.6;color:${DARK.text};margin:0;white-space:pre-wrap;">${preview}</p>
        </div>` +
        button("View Conversation", ticketUrl) +
        mutedText(`Ticket: ${title}`)
    ),
  };
}

export function ticketClosedEmail(username: string, ticketId: number, title: string, ticketUrl: string) {
  return {
    subject: `Nexus support ticket #${ticketId} closed`,
    html: layout(
      heading("Ticket Closed") +
        paragraph(`Your support ticket <strong>#${ticketId}</strong> has been closed.`) +
        metricRow([
          { label: "Ticket", value: `#${ticketId}` },
          { label: "Subject", value: title.length > 30 ? title.slice(0, 30) + "..." : title },
          { label: "Status", value: "Closed" },
        ]) +
        paragraph("If you need further help, you can open a new ticket anytime from the support page.") +
        button("View Ticket", ticketUrl) +
        mutedText(`Account: ${username}`)
    ),
  };
}

export function passwordResetEmail(username: string, resetUrl: string) {
  return {
    subject: "Nexus password reset request",
    html: layout(
      heading("Reset Your Password") +
        paragraph(`We received a request to reset the password for account <strong>${username}</strong>.`) +
        paragraph("Click the button below to set a new password. This link expires in 1 hour.") +
        button("Reset Password", resetUrl) +
        mutedText("If you didn't request this, you can safely ignore this email. Your password won't change.")
    ),
  };
}

// ── Admin Notification Templates ──

export function adminNewUserEmail(username: string, email: string) {
  return {
    subject: `New registration: ${username}`,
    html: layout(
      heading("New User Registration") +
        metricRow([
          { label: "Username", value: username },
          { label: "Email", value: email },
          { label: "Time", value: new Date().toUTCString().slice(0, 22) },
        ]) +
        button("View Users", `${SITE_URL}/admin`)
    ),
    type: "admin_new_user",
  };
}

export function adminNewSubscriptionEmail(username: string, tierName: string) {
  return {
    subject: `New subscription: ${username} (${tierName})`,
    html: layout(
      heading("New Subscription") +
        metricRow([
          { label: "User", value: username },
          { label: "Tier", value: tierName },
          { label: "Status", value: "Active" },
        ]) +
        button("View Admin", `${SITE_URL}/admin`)
    ),
    type: "admin_new_subscription",
  };
}

export function adminSubscriptionCanceledEmail(username: string) {
  return {
    subject: `Subscription canceled: ${username}`,
    html: layout(
      heading("Subscription Canceled") +
        metricRow([
          { label: "User", value: username },
          { label: "Status", value: "Canceled" },
        ]) +
        button("View Admin", `${SITE_URL}/admin`)
    ),
    type: "admin_subscription_canceled",
  };
}

export function adminPaymentFailedEmail(username: string) {
  return {
    subject: `Payment failed: ${username}`,
    html: layout(
      heading("Payment Failed") +
        paragraph(`Payment failed for user <strong>${username}</strong>. The subscription has been marked as past due.`) +
        button("View Admin", `${SITE_URL}/admin`)
    ),
    type: "admin_payment_failed",
  };
}

export function signalAlertEmail(
  signalTitle: string,
  intensity: number,
  category: string,
  date: string,
  signalUrl: string
) {
  const intensityLabels = ["Low", "Moderate", "Elevated", "High", "Critical"];
  return {
    subject: `[L${intensity}] ${signalTitle}`,
    html: layout(
      heading("Signal Detected") +
        paragraph(signalTitle) +
        metricRow([
          { label: "Intensity", value: `L${intensity} ${intensityLabels[intensity - 1] || ""}` },
          { label: "Category", value: category },
          { label: "Date", value: date },
        ]) +
        button("View Signal", signalUrl)
    ),
  };
}

export function paymentActionRequiredEmail(username: string, settingsUrl: string) {
  return {
    subject: "Nexus payment requires action",
    html: layout(
      heading("Action Required") +
        paragraph("Your latest payment requires additional verification. Please complete the payment to maintain your subscription access.") +
        button("Complete Payment", settingsUrl) +
        mutedText(`Account: ${username}`)
    ),
  };
}

export function invoiceUpcomingEmail(username: string, amount: string, settingsUrl: string) {
  return {
    subject: "Nexus upcoming payment",
    html: layout(
      heading("Upcoming Payment") +
        paragraph(`Your next subscription payment of <strong>${amount}</strong> will be charged soon. Make sure your billing details are up to date.`) +
        button("Manage Billing", settingsUrl) +
        mutedText(`Account: ${username}`)
    ),
  };
}

export function invoiceOverdueEmail(username: string, settingsUrl: string) {
  return {
    subject: "Nexus invoice overdue",
    html: layout(
      heading("Invoice Overdue") +
        paragraph("Your invoice is overdue. Please update your payment method to avoid service interruption.") +
        button("Update Billing", settingsUrl) +
        mutedText(`Account: ${username}`)
    ),
  };
}

export interface WeeklyDigestData {
  dateRange: string;
  signalsCount: number;
  highestIntensity: number;
  predictionsCreated: number;
  predictionsResolved: number;
  avgBrier: number | null;
  activeTheses: number;
  regime: string | null;
}

function sectionLabel(text: string) {
  return `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:${DARK.label};margin-top:24px;margin-bottom:8px;border-bottom:1px solid ${DARK.border};padding-bottom:6px;">${text}</div>`;
}

export function weeklyDigestEmail(username: string, data: WeeklyDigestData) {
  const sections: string[] = [];

  sections.push(sectionLabel("Signal Activity"));
  sections.push(metricRow([
    { label: "Signals This Week", value: String(data.signalsCount) },
    { label: "Highest Intensity", value: `${data.highestIntensity}/5` },
  ]));

  sections.push(sectionLabel("Predictions"));
  sections.push(metricRow([
    { label: "Created", value: String(data.predictionsCreated) },
    { label: "Resolved", value: String(data.predictionsResolved) },
    ...(data.avgBrier != null ? [{ label: "Avg Brier", value: data.avgBrier.toFixed(3) }] : []),
  ]));

  sections.push(sectionLabel("Theses & Regime"));
  sections.push(metricRow([
    { label: "Active Theses", value: String(data.activeTheses) },
    ...(data.regime ? [{ label: "Current Regime", value: data.regime }] : []),
  ]));

  return {
    subject: `NEXUS Weekly Brief - ${data.dateRange}`,
    html: layout(
      heading("Weekly Intelligence Brief") +
        mutedText(`${data.dateRange} / ${username}`) +
        sections.join("") +
        button("View Dashboard", `${SITE_URL}/dashboard`) +
        mutedText(`<a href="${SITE_URL}/settings?tab=notifications" style="color:${DARK.muted};font-size:11px;">Unsubscribe from weekly digests</a>`)
    ),
  };
}
