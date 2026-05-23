const DEFAULT_API_URL = 'https://api.openpanel.dev';

export function buildOpenpanelClient(config) {
  const clientId = process.env.OPENPANEL_CLIENT_ID || config.client_id;
  const clientSecret = process.env.OPENPANEL_CLIENT_SECRET || config.client_secret;
  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing OpenPanel credentials. Set OPENPANEL_CLIENT_ID and OPENPANEL_CLIENT_SECRET (or pass via config). Credentials need `read` or `root` access.',
    );
  }
  const apiUrl = (process.env.OPENPANEL_API_URL || config.api_url || DEFAULT_API_URL).replace(/\/$/, '');
  const projectId = config.project_id;
  if (!projectId) throw new Error('OpenPanel source requires `source.project_id` in pulse.config.yaml.');

  const headers = {
    'openpanel-client-id': clientId,
    'openpanel-client-secret': clientSecret,
    'content-type': 'application/json',
  };

  async function request(path, { method = 'GET', query, body } = {}) {
    const url = new URL(`${apiUrl}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v == null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    const res = await fetch(url, {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenPanel ${res.status} ${method} ${url.pathname}: ${text}`);
    }
    return res.json();
  }

  return { request, projectId, apiUrl };
}
