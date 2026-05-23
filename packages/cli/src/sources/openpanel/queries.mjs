import { buildOpenpanelClient } from './client.mjs';
import { windowToDateRange } from '../../util/date.mjs';

// OpenPanel's accepted `range` values (verified against api.openpanel.dev 2026-05-23):
//   30min | lastHour | last24h | today | yesterday | 7d | 30d | 3m | 6m | 12m
//   | monthToDate | lastMonth | yearToDate | lastYear | custom
// Note the inconsistency: prefixed (lastHour, last24h) and unprefixed (7d, 30d).
// 48h / 72h have no direct equivalent — both fall back to 7d.
const WINDOW_TO_RANGE = {
  '1h': 'lastHour',
  '24h': 'last24h',
  '48h': '7d',
  '72h': '7d',
  '7d': '7d',
  '30d': '30d',
};

export async function runReports(config) {
  const source = config.source;
  const client = buildOpenpanelClient(source);
  const dateRange = windowToDateRange(config.window, config.timezone);
  const projectId = client.projectId;
  const range = WINDOW_TO_RANGE[config.window] || 'last24h';

  // The OpenPanel HTTP API surface used by this adapter is small and frequently shifts.
  // We deliberately DO NOT silently swallow failures any more (see #13). Each call returns
  // either { data: ..., status: 'ok' } or { error, status, code } so aggregate.mjs can render
  // partial data plus a Followups warning, and the CLI exits 0 with diagnostics rather than
  // a silent all-zeros pulse.

  const tasks = {
    metrics: client.request(`/insights/${projectId}/metrics`, { query: { range } }),
    // /export/charts returns 404 on api.openpanel.dev as of 2026-05-23. Until a working
    // breakdown endpoint is identified, pages and traffic stay empty.
    pages: Promise.resolve({ error: 'not implemented — /export/charts is 404 on api.openpanel.dev. See ga4-pulse#13.', data: [] }),
    traffic: Promise.resolve({ error: 'not implemented — /export/charts is 404 on api.openpanel.dev. See ga4-pulse#13.', data: [] }),
    events: client.request(`/export/events`, {
      query: { projectId, range, limit: 200, includes: 'properties' },
    }),
  };

  const settled = await Promise.allSettled(Object.values(tasks));
  const labels = Object.keys(tasks);
  const out = {};
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const result = settled[i];
    if (result.status === 'fulfilled') {
      out[label] = result.value;
    } else {
      // Surface the error in the returned shape so aggregate + followups can flag it,
      // and emit to stderr so CI logs show the cause.
      const message = result.reason?.message || String(result.reason);
      process.stderr.write(`ga4-pulse: openpanel ${label} call failed — ${message}\n`);
      out[label] = { error: message, data: [] };
    }
  }

  return {
    metrics: out.metrics,
    pagesChart: out.pages,
    trafficChart: out.traffic,
    eventsList: out.events,
    dateRange,
    diagnostics: {
      window_mapped_to: range,
      errors: Object.fromEntries(
        Object.entries(out)
          .filter(([, v]) => v && v.error)
          .map(([k, v]) => [k, v.error]),
      ),
    },
  };
}
