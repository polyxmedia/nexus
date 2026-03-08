const BRAND = {
  bg: "#000000",
  card: "#0a0a0a",
  border: "#1f1f1f",
  text: "#e0e0e0",
  muted: "#787878",
  accent: "#06b6d4",
  name: "Nexus Intelligence",
};

function layout(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'IBM Plex Sans',-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:8px;">
  <tr><td style="padding:32px 40px 24px;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:${BRAND.accent};margin-bottom:24px;">${BRAND.name}</div>
    ${content}
  </td></tr>
  <tr><td style="padding:16px 40px 24px;border-top:1px solid ${BRAND.border};">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:1px;">
      Nexus Intelligence Platform
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function heading(text: string) {
  return `<h1 style="font-size:20px;font-weight:600;color:${BRAND.text};margin:0 0 16px;">${text}</h1>`;
}

function paragraph(text: string) {
  return `<p style="font-size:14px;line-height:1.6;color:${BRAND.text};margin:0 0 16px;">${text}</p>`;
}

function mutedText(text: string) {
  return `<p style="font-size:12px;line-height:1.5;color:${BRAND.muted};margin:0 0 12px;">${text}</p>`;
}

function button(text: string, url: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td>
    <a href="${url}" style="display:inline-block;padding:10px 24px;background:${BRAND.accent};color:#000;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;text-decoration:none;border-radius:4px;">
      ${text}
    </a>
  </td></tr></table>`;
}

function metricRow(items: { label: string; value: string }[]) {
  const cells = items
    .map(
      (item) =>
        `<td style="padding:12px 16px;border:1px solid ${BRAND.border};border-radius:4px;">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${BRAND.muted};margin-bottom:4px;">${item.label}</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:16px;font-weight:700;color:${BRAND.text};">${item.value}</div>
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
