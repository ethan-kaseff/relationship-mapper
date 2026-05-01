import { Resend } from "resend";
import { renderEmail, ThemeName } from "./email-themes";

export const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendCampaignEmailOptions {
  to: string;
  recipientName: string | null;
  subject: string;
  body: string;
  theme: ThemeName;
  trackingToken: string;
  orgName: string;
}

export async function sendCampaignEmail(options: SendCampaignEmailOptions): Promise<void> {
  const { to, recipientName, subject, body, theme, trackingToken, orgName } = options;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const trackingPixelUrl = `${appUrl}/api/track/open/${trackingToken}`;

  const html = renderEmail(theme, { subject, body, recipientName, trackingPixelUrl, orgName });
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";

  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
