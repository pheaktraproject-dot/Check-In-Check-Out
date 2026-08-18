// Sends transactional email via Resend (https://resend.com). Resend has a
// free tier that's enough for normal staff-registration volume.
//
// Required environment variables:
//   RESEND_API_KEY  - from the Resend dashboard
//   EMAIL_FROM      - the "from" address, e.g. "Alongsiders Attendance <attendance@alongsiders.org>"
//                     Must be a domain you have verified in Resend.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Alongsiders Attendance <onboarding@resend.dev>";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    // eslint-disable-next-line no-console
    console.error("RESEND_API_KEY is not configured — email was not sent.");
    throw new Error("Email service is not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html })
  });

  if (!res.ok) {
    const text = await res.text();
    // eslint-disable-next-line no-console
    console.error("Resend send failed:", res.status, text);
    throw new Error("Could not send email");
  }
}

export function verificationEmailHtml(name: string, verifyUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#1F5F4E;">Confirm your email</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>Thanks for registering for Alongsiders Attendance. Please confirm your email address to finish setting up your account:</p>
      <p style="text-align:center; margin: 24px 0;">
        <a href="${verifyUrl}" style="background:#1F5F4E; color:#fff; padding:12px 24px; border-radius:24px; text-decoration:none; display:inline-block;">
          Confirm My Email
        </a>
      </p>
      <p style="color:#666; font-size: 13px;">This link expires in 24 hours. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}
