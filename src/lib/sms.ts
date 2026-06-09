import { BrevoClient } from "@getbrevo/brevo";
import { getGymSettings } from "./gym-settings";

export async function sendSMS(to: string, content: string) {
  const s = await getGymSettings();
  if (!s.brevoApiKey || !s.brevoSmsFrom) return;

  const brevo = new BrevoClient({ apiKey: s.brevoApiKey });
  await brevo.transactionalSms.sendAsyncTransactionalSms({
    sender: s.brevoSmsFrom,
    recipient: to,
    content,
  });
}
