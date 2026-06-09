import { BrevoClient } from "@getbrevo/brevo";
import { getGymSettings } from "./gym-settings";

export async function sendEmail(to: string, subject: string, html: string) {
  const s = await getGymSettings();
  if (!s.brevoApiKey || !s.brevoSenderEmail) return;

  const brevo = new BrevoClient({ apiKey: s.brevoApiKey });
  await brevo.transactionalEmails.sendTransacEmail({
    sender: { email: s.brevoSenderEmail, name: s.brevoSenderName ?? undefined },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  });
}
