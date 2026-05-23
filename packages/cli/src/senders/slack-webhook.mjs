export const slackWebhook = {
  name: 'slack-webhook',
  async send({ subject, markdown }) {
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!url) throw new Error('SLACK_WEBHOOK_URL env var is required.');
    const text = `*${subject}*\n${markdown}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Slack webhook ${res.status}: ${body}`);
    }
    return { id: 'slack' };
  },
};
