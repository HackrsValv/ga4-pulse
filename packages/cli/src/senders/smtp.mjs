import nodemailer from 'nodemailer';

export const smtp = {
  name: 'smtp',
  async send({ subject, html, from, to }) {
    const url = process.env.SMTP_URL;
    if (!url) throw new Error('SMTP_URL env var is required (e.g. smtps://user:pass@host:465).');
    const transporter = nodemailer.createTransport(url);
    const info = await transporter.sendMail({
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    return { id: info.messageId };
  },
};
