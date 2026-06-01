import { buildOpenpanelClient, resolveProjectId } from './client.mjs';
import { windowToDateRange, windowToInstantRange } from '../../util/date.mjs';

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

const EVENTS_PAGE_LIMIT = 1000;
const DEFAULT_EVENTS_MAX_PAGES = 20; // 20 * 1000 = 20k-event safety cap

// Page through /export/events accumulating all rows in [start,end]. Returns
// { data, totalCount, capped }. `capped` is true when the page cap is hit before
// all pages are exhausted — surfaced as a warning, never silently dropped.
export async function fetchAllEvents(client, { path, projectId, start, end, maxPages = DEFAULT_EVENTS_MAX_PAGES }) {
  const rows = [];
  let page = 1;
  let totalPages = 1;
  let totalCount = 0;
  let capped = false;
  while (page <= totalPages) {
    if (page > maxPages) { capped = true; break; }
    const res = await client.request(path, {
      query: { projectId, start, end, page, limit: EVENTS_PAGE_LIMIT },
    });
    const batch = res?.data || res?.events || res?.items || [];
    rows.push(...batch);
    const meta = res?.meta || {};
    totalPages = Number(meta.pages ?? totalPages) || totalPages;
    totalCount = Number(meta.totalCount ?? rows.length) || rows.length;
    if (!batch.length) break;
    page += 1;
  }
  return { data: rows, totalCount, capped };
}

export async function runReports(config) {
  const source = config.source;
  const client = buildOpenpanelClient(source);
  const dateRange = windowToDateRange(config.window, config.timezone);
  const instant = windowToInstantRange(config.window);
  const projectId = await resolveProjectId(client, source);
  client.projectId = projectId;

  const range = resolveRange(config.window, source);
  const plan = buildRequestPlan({ projectId, range, source });
  const endpoints = { ...DEFAULT_ENDPOINTS, ...(source.endpoints || {}) };
  const eventsPath = endpoints.events.replace('{projectId}', projectId);

  // /export/events is the headline source whenever /insights is unavailable, and the
  // source for event counts. Fetch the full window (paged) regardless of insights.
  const eventsPromise = fetchAllEvents(client, {
    path: eventsPath,
    projectId,
    start: instant.start,
    end: instant.end,
    maxPages: source.events_max_pages,
  })
    .then((r) => ({ data: r.data, meta: { totalCount: r.totalCount }, capped: r.capped }))
    .catch((err) => ({ error: err?.message || String(err), data: [] }));

  const tasks = { events: eventsPromise };

  // Skip /insights entirely when the deployment has no insights router (skip_insights);
  // otherwise attempt it and let aggregate fall back to events on error.
  if (source.skip_insights) {
    tasks.metrics = Promise.resolve({ skipped: true });
  } else {
    tasks.metrics = client.request(plan.metrics.path, { query: plan.metrics.query });
  }

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
      window_instant: instant,
      endpoints,
      events_capped: out.events?.capped || false,
      errors: Object.fromEntries(
        Object.entries(out)
          .filter(([, v]) => v && v.error)
          .map(([k, v]) => [k, v.error]),
      ),
    },
  };
}
