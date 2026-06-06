export type ThemeName = "classic" | "navy" | "warm" | "modern";

export const THEMES: { id: ThemeName; label: string; description: string; previewBg: string; previewAccent: string }[] = [
  { id: "classic", label: "Classic", description: "White background, indigo header", previewBg: "#ffffff", previewAccent: "#3730a3" },
  { id: "navy",    label: "Navy",    description: "Dark navy with gold accents",    previewBg: "#0f172a", previewAccent: "#f59e0b" },
  { id: "warm",    label: "Warm",    description: "Cream background, burgundy",     previewBg: "#fdf6ee", previewAccent: "#9b1c31" },
  { id: "modern",  label: "Modern",  description: "Minimal white with teal bar",    previewBg: "#ffffff", previewAccent: "#0d9488" },
];

interface RenderOptions {
  subject: string;
  body: string;
  recipientName: string | null;
  trackingPixelUrl: string;
  orgName: string;
}

function bodyToHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px 0;line-height:1.6">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function greeting(name: string | null): string {
  return name ? `<p style="margin:0 0 16px 0;line-height:1.6">Dear ${name},</p>` : "";
}

export function renderEmail(theme: ThemeName, options: RenderOptions): string {
  const { subject, body, recipientName, trackingPixelUrl, orgName } = options;
  const bodyHtml = bodyToHtml(body);
  const greetingHtml = greeting(recipientName);
  const pixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:block;border:0" alt="">`;

  switch (theme) {
    case "navy":
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="background:#1e293b;border-radius:8px 8px 0 0;padding:32px 40px;text-align:center">
    <p style="margin:0;color:#f59e0b;font-size:13px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif">${orgName}</p>
  </td></tr>
  <tr><td style="background:#1e293b;padding:0 40px 8px;text-align:center;border-bottom:2px solid #f59e0b">
    <h1 style="margin:0;color:#f8fafc;font-size:26px;font-weight:normal;line-height:1.3">${subject}</h1>
  </td></tr>
  <tr><td style="background:#ffffff;padding:36px 40px;color:#1e293b;font-size:15px">
    ${greetingHtml}${bodyHtml}
  </td></tr>
  <tr><td style="background:#0f172a;border-radius:0 0 8px 8px;padding:20px 40px;text-align:center">
    <p style="margin:0;color:#64748b;font-size:12px;font-family:Arial,sans-serif">&copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
  </td></tr>
</table>
</td></tr></table>
${pixel}</body></html>`;

    case "warm":
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#fdf6ee;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="background:#9b1c31;border-radius:8px 8px 0 0;padding:28px 40px;text-align:center">
    <p style="margin:0 0 6px;color:#fecdd3;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif">${orgName}</p>
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:normal;line-height:1.3">${subject}</h1>
  </td></tr>
  <tr><td style="background:#ffffff;border-left:4px solid #9b1c31;border-right:4px solid #9b1c31;padding:36px 40px;color:#374151;font-size:15px">
    ${greetingHtml}${bodyHtml}
  </td></tr>
  <tr><td style="background:#fdf0e8;border-radius:0 0 8px 8px;border:4px solid #9b1c31;border-top:none;padding:20px 40px;text-align:center">
    <p style="margin:0;color:#9ca3af;font-size:12px;font-family:Arial,sans-serif">&copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
  </td></tr>
</table>
</td></tr></table>
${pixel}</body></html>`;

    case "modern":
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="background:#0d9488;border-radius:8px 8px 0 0;padding:6px 0;font-size:0">&nbsp;</td></tr>
  <tr><td style="background:#ffffff;padding:32px 40px 8px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
    <p style="margin:0 0 4px;color:#0d9488;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:bold">${orgName}</p>
    <h1 style="margin:0 0 24px;color:#0f172a;font-size:22px;font-weight:700;line-height:1.3">${subject}</h1>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px">
  </td></tr>
  <tr><td style="background:#ffffff;padding:0 40px 36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;color:#374151;font-size:15px;line-height:1.6">
    ${greetingHtml}${bodyHtml}
  </td></tr>
  <tr><td style="background:#f8fafc;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;padding:20px 40px;text-align:center">
    <p style="margin:0;color:#94a3b8;font-size:12px">&copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
  </td></tr>
</table>
</td></tr></table>
${pixel}</body></html>`;

    default: // classic
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="background:#3730a3;border-radius:8px 8px 0 0;padding:28px 40px;text-align:center">
    <p style="margin:0 0 6px;color:#c7d2fe;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif">${orgName}</p>
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:normal;line-height:1.3">${subject}</h1>
  </td></tr>
  <tr><td style="background:#ffffff;padding:36px 40px;color:#1f2937;font-size:15px">
    ${greetingHtml}${bodyHtml}
  </td></tr>
  <tr><td style="background:#eef2ff;border-radius:0 0 8px 8px;border-top:3px solid #3730a3;padding:20px 40px;text-align:center">
    <p style="margin:0;color:#6b7280;font-size:12px;font-family:Arial,sans-serif">&copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
  </td></tr>
</table>
</td></tr></table>
${pixel}</body></html>`;
  }
}
