import { buildOpenpanelClient, resolveProjectId } from './client.mjs';
import { windowToDateRange } from '../../util/date.mjs';

// Defaults verified 2026-05-23 against self-hosted OpenPanel (insights.router.ts +
// export.router.ts). Override via `source.endpoints.*` and `source.range_map.*`
// in pulse.config.yaml. See docs/openpanel-setup.md.
//
// `metrics` was `/insights/{projectId}/metrics` (#13 finding 4: 404 — no such route).
// `/overview` is the headlines-equivalent route on insights.router.
//
// `charts` is a GET endpoint with query-string params, not POST with JSON body
// (#13 finding 5: export.router only defines GET handlers).
const DEFAULT_ENDPOINTS = {
  metrics: '/insights/{projectId}/overview',
  charts: '/export/charts',
  events: '/export/events',
};
const DEFAULT_RANGE_MAP = {
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
  const projectId = await resolveProjectId(client, source);
  client.projectId = projectId;

  const endpoints = { ...DEFAULT_ENDPOINTS, ...(source.endpoints || {}) };
  const rangeMap = { ...DEFAULT_RANGE_MAP, ...(source.range_map || {}) };
  const range = rangeMap[config.window] || 'last24h';
  const expand = (path) => path.replace('{projectId}', projectId);

  const tasks = {
    metrics: client.request(expand(endpoints.metrics), { query: { range } }),
    events: client.request(expand(endpoints.events), {
      query: { projectId, range, limit: 200, includes: 'properties' },
    }),
  };

  if (source.skip_charts) {
    tasks.pages = Promise.resolve({
      error: 'skipped — source.skip_charts is true',
      data: [],
    });
    tasks.traffic = Promise.resolve({
      error: 'skipped — source.skip_charts is true',
      data: [],
    });
  } else {
    // GET /export/charts with query params (per export.router; no POST handler exists).
    // breakdown param accepts a single dimension name. Run two GETs in parallel —
    // pages by `path`, traffic by `utm_source` (referrer fallback handled in aggregate).
    tasks.pages = client.request(expand(endpoints.charts), {
      query: { projectId, range, event: 'screen_view', breakdown: 'path' },
    });
    tasks.traffic = client.request(expand(endpoints.charts), {
      query: { projectId, range, event: 'screen_view', breakdown: 'utm_source' },
    });
  }

  const labels = Object.keys(tasks);
  const settled = await Promise.allSettled(Object.values(tasks));
  const out = {};
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const result = settled[i];
    if (result.status === 'fulfilled') {
      out[label] = result.value;
    } else {
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
      endpoints,
      errors: Object.fromEntries(
        Object.entries(out)
          .filter(([, v]) => v && v.error)
          .map(([k, v]) => [k, v.error]),
      ),
    },
  };
}
