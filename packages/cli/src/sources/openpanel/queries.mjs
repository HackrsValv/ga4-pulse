import { buildOpenpanelClient, resolveProjectId } from './client.mjs';
import { windowToDateRange } from '../../util/date.mjs';

// Defaults verified 2026-06-01 against upstream OpenPanel
// (apps/api/src/routes/export.router.ts, apps/api/src/controllers/export.controller.ts,
//  packages/validation/src/index.ts).
//
// `/insights/{projectId}/overview` — headlines route on insights.router. NOTE: not deployed on
// every self-host (older/split deployments expose only /export/* + the SDK API). See ga4-pulse#19.
//
// `/export/charts` (GET) querystring = chartSchemeFull:
//   - range: enum from timeWindows — '30min'|'lastHour'|'today'|'yesterday'|'7d'|'30d'|'6m'|
//     '12m'|'monthToDate'|'lastMonth'|'yearToDate'|'lastYear'|'custom'. ('last24h' is NOT valid.)
//   - events: REQUIRED array of { name, filters?, segment?, property? } (alias `series`).
//   - breakdowns: array of { id?, name } (plural; singular `breakdown` is ignored).
//   The API runs parseQueryString() (getSafeJson on each value) in preValidation, so array/object
//   params must be JSON-encoded strings; client.request stringifies via searchParams.set.
//
// `/export/events` (GET) takes start/end/page/limit/event/includes — it has NO `range` param.
const DEFAULT_ENDPOINTS = {
  metrics: '/insights/{projectId}/overview',
  charts: '/export/charts',
  events: '/export/events',
};

// Every value must be a valid timeWindows enum. '24h' has no exact trailing-24h enum; 'today'
// is the closest valid bucket. Charts use coarse enum windows; trailing-window precision for
// headline metrics is handled via /export/events aggregation (ga4-pulse#19).
const DEFAULT_RANGE_MAP = {
  '1h': 'lastHour',
  '24h': 'today',
  '48h': '7d',
  '72h': '7d',
  '7d': '7d',
  '30d': '30d',
};

const VALID_RANGES = new Set([
  '30min', 'lastHour', 'today', 'yesterday', '7d', '30d', '6m', '12m',
  'monthToDate', 'lastMonth', 'yearToDate', 'lastYear', 'custom',
]);

export function resolveRange(window, source = {}) {
  const rangeMap = { ...DEFAULT_RANGE_MAP, ...(source.range_map || {}) };
  const range = rangeMap[window] || '30d';
  return VALID_RANGES.has(range) ? range : '30d';
}

// Pure, testable: build each task's { path, query } without executing it.
// pages/traffic are null when source.skip_charts is set.
export function buildRequestPlan({ projectId, range, source = {} }) {
  const endpoints = { ...DEFAULT_ENDPOINTS, ...(source.endpoints || {}) };
  const expand = (path) => path.replace('{projectId}', projectId);
  const chartEvent = source.chart_event || 'screen_view';

  const plan = {
    metrics: { path: expand(endpoints.metrics), query: { range } },
    events: {
      path: expand(endpoints.events),
      query: { projectId, limit: 200, includes: 'properties' },
    },
    pages: null,
    traffic: null,
  };

  if (source.skip_charts) return plan;

  const chartQuery = (breakdown) => ({
    projectId,
    range,
    events: JSON.stringify([{ name: chartEvent }]),
    breakdowns: JSON.stringify([{ name: breakdown }]),
  });
  plan.pages = { path: expand(endpoints.charts), query: chartQuery('path') };
  plan.traffic = { path: expand(endpoints.charts), query: chartQuery('utm_source') };
  return plan;
}

export async function runReports(config) {
  const source = config.source;
  const client = buildOpenpanelClient(source);
  const dateRange = windowToDateRange(config.window, config.timezone);
  const projectId = await resolveProjectId(client, source);
  client.projectId = projectId;

  const range = resolveRange(config.window, source);
  const plan = buildRequestPlan({ projectId, range, source });

  const tasks = {
    metrics: client.request(plan.metrics.path, { query: plan.metrics.query }),
    events: client.request(plan.events.path, { query: plan.events.query }),
  };

  if (plan.pages) {
    tasks.pages = client.request(plan.pages.path, { query: plan.pages.query });
    tasks.traffic = client.request(plan.traffic.path, { query: plan.traffic.query });
  } else {
    tasks.pages = Promise.resolve({ error: 'skipped — source.skip_charts is true', data: [] });
    tasks.traffic = Promise.resolve({ error: 'skipped — source.skip_charts is true', data: [] });
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
      endpoints: { ...DEFAULT_ENDPOINTS, ...(source.endpoints || {}) },
      errors: Object.fromEntries(
        Object.entries(out)
          .filter(([, v]) => v && v.error)
          .map(([k, v]) => [k, v.error]),
      ),
    },
  };
}
