import { BrevoClient } from "@getbrevo/brevo";
import { getGymSettings } from "./gym-settings";

export async function sendEmail(to: string, subject: string, html: string) {
  const s = await getGymSettings();
  if (!s.brevoApiKey || !s.brevoSenderEmail) {
    console.warn(`[email] skipped "${subject}" to ${to} — Brevo API key or sender email not configured in Settings`);
    return;
  }

  const brevo = new BrevoClient({ apiKey: s.brevoApiKey });
  try {
    await brevo.transactionalEmails.sendTransacEmail({
      sender: { email: s.brevoSenderEmail, name: s.brevoSenderName ?? undefined },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });
    console.log(`[email] sent "${subject}" to ${to}`);
  } catch (err) {
    console.error(`[email] failed to send "${subject}" to ${to}:`, err);
    throw err;
  }
}
