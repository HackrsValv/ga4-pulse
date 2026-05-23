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

  // project_id is now optional — resolved lazily via resolveProjectId() when first needed.
  // Keep the configured value as a fast path; runReports() calls resolveProjectId() before
  // any other request to populate this if absent.
  const client = { request, apiUrl, projectId: config.project_id || null };
  return client;
}

export async function resolveProjectId(client, source) {
  if (source.project_id) return source.project_id;
  let list;
  try {
    list = await client.request('/manage/projects');
  } catch (err) {
    throw new Error(
      `OpenPanel: could not list projects for auto-discovery (${err.message}). Set source.project_id in pulse.config.yaml or ensure the client has read scope.`,
      { cause: err },
    );
  }
  const projects = Array.isArray(list) ? list : (list.data ?? list.projects ?? []);
  if (projects.length === 1) return projects[0].id;
  if (projects.length === 0) {
    throw new Error(
      'OpenPanel: this client has no project access. Provision a read or root client scoped to the project, or set source.project_id explicitly.',
    );
  }
  const summary = projects
    .map((p) => `${p.id}${p.slug || p.name ? ` (${p.slug || p.name})` : ''}`)
    .join(', ');
  throw new Error(
    `OpenPanel: this client has access to ${projects.length} projects (${summary}). Set source.project_id in pulse.config.yaml to disambiguate.`,
  );
}
