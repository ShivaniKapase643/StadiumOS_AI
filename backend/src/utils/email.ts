import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

let transporterPromise: Promise<Transporter> | null = null;

async function getTransporter(): Promise<Transporter> {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (env.smtp.configured) {
      return nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: { user: env.smtp.user, pass: env.smtp.pass },
      });
    }

    // Dev-safe fallback: a real Ethereal test inbox, so emails are genuinely
    // sent and previewable without requiring the user's own SMTP credentials.
    const testAccount = await nodemailer.createTestAccount();
    logger.info(`Using Ethereal dev SMTP inbox — login at https://ethereal.email with:
      user: ${testAccount.user}
      pass: ${testAccount.pass}`);
    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  })();

  return transporterPromise;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info(`Email preview URL: ${previewUrl}`);
  }
}
