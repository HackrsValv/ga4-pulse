import { mailgun } from './mailgun.mjs';
import { resend } from './resend.mjs';
import { sendgrid } from './sendgrid.mjs';
import { smtp } from './smtp.mjs';
import { slackWebhook } from './slack-webhook.mjs';

export const senders = {
  mailgun,
  resend,
  sendgrid,
  smtp,
  'slack-webhook': slackWebhook,
};
