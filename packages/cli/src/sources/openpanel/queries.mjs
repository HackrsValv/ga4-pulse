import { buildOpenpanelClient, resolveProjectId } from './client.mjs';
import { windowToDateRange } from '../../util/date.mjs';

// Defaults reflect api.openpanel.dev as of 2026-05-23. Self-hosted OpenPanel instances
// or future API revisions may use different paths and range labels — override via
// `source.endpoints.*` and `source.range_map.*` in pulse.config.yaml. See docs/openpanel-setup.md.
const DEFAULT_ENDPOINTS = {
  metrics: '/insights/{projectId}/metrics',
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
    const chartBody = (event, breakdowns) => ({
      projectId,
      range,
      series: [
        {
          id: event,
          name: event,
          event: { name: event },
          aggregations: [{ name: 'count' }, { name: 'unique_visitors' }],
        },
      ],
      breakdowns,
    });
    tasks.pages = client.request(expand(endpoints.charts), {
      method: 'POST',
      body: chartBody('screen_view', [{ name: 'path' }]),
    });
    tasks.traffic = client.request(expand(endpoints.charts), {
      method: 'POST',
      body: chartBody('screen_view', [
        { name: 'referrer' },
        { name: 'utm_source' },
        { name: 'utm_medium' },
      ]),
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
