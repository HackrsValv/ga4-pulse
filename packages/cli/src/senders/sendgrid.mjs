export const sendgrid = {
  name: 'sendgrid',
  async send({ subject, html, from, to }) {
    const key = process.env.SENDGRID_API_KEY;
    if (!key) throw new Error('SENDGRID_API_KEY env var is required.');
    const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: recipients }],
        from: { email: from },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SendGrid ${res.status}: ${text}`);
    }
    return { id: res.headers.get('x-message-id') || undefined };
  },
};
