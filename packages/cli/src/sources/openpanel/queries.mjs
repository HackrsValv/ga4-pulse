import { buildOpenpanelClient } from './client.mjs';
import { windowToDateRange } from '../../util/date.mjs';

const WINDOW_TO_RANGE = {
  '1h': 'lastHour',
  '24h': 'last24h',
  '48h': 'last48h',
  '72h': 'last72h',
  '7d': 'last7d',
  '30d': 'last30d',
};

export async function runReports(config) {
  const source = config.source;
  const client = buildOpenpanelClient(source);
  const dateRange = windowToDateRange(config.window, config.timezone);

  const projectId = client.projectId;
  const range = WINDOW_TO_RANGE[config.window] || 'last24h';

  const filters = [];
  if (source.hostname_regex || config.ga4?.hostname_regex) {
    // OpenPanel host filter — best-effort. Adjust based on actual field name in your project.
    filters.push({ name: '__host', operator: 'regex', value: source.hostname_regex || config.ga4.hostname_regex });
  }

  // /export/charts: aggregated time-series with breakdowns
  const baseChartSeries = (event) => ({
    id: event,
    name: event,
    event: { name: event },
    filters,
    aggregations: [{ name: 'count' }, { name: 'unique_visitors' }],
  });

  const queries = [
    client.request(`/insights/${projectId}/metrics`, {
      query: { range },
    }).catch(() => ({ metrics: {} })),
    client.request(`/export/charts`, {
      method: 'POST',
      body: { projectId, range, series: [baseChartSeries('screen_view')], breakdowns: [{ name: 'path' }] },
    }).catch((e) => ({ error: e.message, data: [] })),
    client.request(`/export/charts`, {
      method: 'POST',
      body: { projectId, range, series: [baseChartSeries('screen_view')], breakdowns: [{ name: 'referrer' }, { name: 'utm_source' }, { name: 'utm_medium' }] },
    }).catch((e) => ({ error: e.message, data: [] })),
    client.request(`/export/events`, {
      query: { projectId, range, limit: 200, includes: 'properties' },
    }).catch((e) => ({ error: e.message, data: [] })),
  ];

  const [metrics, pagesChart, trafficChart, eventsList] = await Promise.all(queries);

  return { metrics, pagesChart, trafficChart, eventsList, dateRange };
}
