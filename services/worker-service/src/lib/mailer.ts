import nodemailer from 'nodemailer';
import { logger } from '@spacode/utils';
import { getConfig } from '../config.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const cfg = getConfig();
  if (!cfg.GMAIL_USER || !cfg.GMAIL_APP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: cfg.GMAIL_USER, pass: cfg.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}): Promise<{ messageId: string }> {
  const transport = getTransporter();
  if (!transport) {
    logger.warn('Gmail not configured — email logged only');
    return { messageId: `stub-${Date.now()}` };
  }

  const info = await transport.sendMail({
    from: getConfig().GMAIL_USER,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? opts.html?.replace(/<[^>]+>/g, ''),
  });

  return { messageId: info.messageId ?? `msg-${Date.now()}` };
}
