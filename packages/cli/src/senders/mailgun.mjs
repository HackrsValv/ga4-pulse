export const mailgun = {
  name: 'mailgun',
  async send({ subject, html, from, to, config }) {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    if (!apiKey) throw new Error('MAILGUN_API_KEY env var is required.');
    if (!domain) throw new Error('MAILGUN_DOMAIN env var is required.');
    const region = (process.env.MAILGUN_REGION || config.region || 'us').toLowerCase();
    if (region !== 'us' && region !== 'eu') {
      throw new Error(`MAILGUN_REGION must be 'us' or 'eu', got '${region}'`);
    }
    const host = region === 'eu' ? 'api.eu.mailgun.net' : 'api.mailgun.net';
    const url = `https://${host}/v3/${domain}/messages`;

    const body = new URLSearchParams();
    body.set('from', from);
    for (const recipient of asArray(to)) body.append('to', recipient);
    body.set('subject', subject);
    body.set('html', html);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64'),
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mailgun ${res.status}: ${text}`);
    }
    const json = await res.json();
    return { id: json.id };
  },
};

function asArray(v) {
  return Array.isArray(v) ? v : [v];
}
