// Normalize OpenPanel responses into the same shape ga4/aggregate emits.
// Headlines come from /insights when it returns usable numbers; otherwise they are
// derived client-side from the /export/events stream (self-hosts without insights routes).
export function aggregate(reports, config) {
  const events = collectEvents(reports.eventsList);
  const eventMap = Object.fromEntries(events.map((e) => [e.name, e]));

  const conversionEvents = config.report?.conversion_events || ['conversion', 'purchase', 'lead'];
  const conversions = conversionEvents.reduce((sum, n) => sum + (eventMap[n]?.count || 0), 0);

  const insights = reports.metrics;
  const insightsUsable =
    insights && !insights.error && !insights.skipped && hasAnySignal(insights);

  const headlinesSource = insightsUsable ? 'insights' : 'events';
  const totals = insightsUsable
    ? totalsFromInsights(insights)
    : totalsFromEvents(reports.eventsList, config);
  totals.conversions = conversions;
  if (!totals.keyEvents) totals.keyEvents = conversions;

  const pages = breakdownToPages(reports.pagesChart);
  const traffic = breakdownToTraffic(reports.trafficChart);

  const warnings = [];
  // A 404 from /insights on a self-host without insights routes is expected; when we
  // fall back to events cleanly, note that instead of raising the raw error as alarm.
  if (insights?.error && headlinesSource === 'events') {
    warnings.push(`OpenPanel insights unavailable — headlines derived from /export/events (${insights.error})`);
  } else if (insights?.error) {
    warnings.push(`OpenPanel metrics: ${insights.error}`);
  }
  if (reports.pagesChart?.error) warnings.push(`OpenPanel pages: ${reports.pagesChart.error}`);
  if (reports.trafficChart?.error) warnings.push(`OpenPanel traffic: ${reports.trafficChart.error}`);
  if (reports.eventsList?.error) warnings.push(`OpenPanel events: ${reports.eventsList.error}`);
  if (reports.eventsList?.capped) {
    warnings.push('OpenPanel events: page cap reached — totals may undercount; raise source.events_max_pages');
  }

  return {
    totals,
    hosts: [],
    events,
    eventMap,
    pages,
    traffic,
    warnings,
    diagnostics: { ...(reports.diagnostics || {}), headlines_source: headlinesSource },
    window: {
      start: reports.dateRange.startDate,
      end: reports.dateRange.endDate,
      label: reports.dateRange.label,
    },
  };
}

function hasAnySignal(metrics) {
  const keys = ['sessions', 'session_count', 'sessions_count', 'visitors', 'unique_visitors', 'users', 'pageviews', 'page_views', 'screen_views', 'events'];
  return keys.some((k) => metrics[k] != null);
}

function totalsFromInsights(metrics) {
  return {
    sessions: pickNumber(metrics, ['sessions', 'session_count', 'sessions_count']),
    users: pickNumber(metrics, ['visitors', 'unique_visitors', 'users']),
    pageviews: pickNumber(metrics, ['pageviews', 'page_views', 'screen_views', 'events']),
    engagedSessions: pickNumber(metrics, ['engaged_sessions']),
    engagementSeconds: pickNumber(metrics, ['engagement_seconds', 'avg_session_duration', 'duration']),
    keyEvents: pickNumber(metrics, ['key_events', 'conversions']),
    bounceRate: pickNumber(metrics, ['bounce_rate', 'bounces']) || 0,
    conversions: 0,
  };
}

function totalsFromEvents(list, config) {
  const rows = (list && !list.error && (list.data || list.events || list.items)) || [];
  const pageviewEvent = config.source?.pageview_event || 'screen_view';
  const sessions = new Set();
  const users = new Set();
  let pageviews = 0;
  let durationMs = 0;
  for (const row of rows) {
    const sid = row.sessionId || row.session_id;
    const uid = row.profileId || row.profile_id || row.deviceId || row.device_id;
    if (sid) sessions.add(sid);
    if (uid) users.add(uid);
    const name = row.name || row.event_name || row.event;
    if (name === pageviewEvent) pageviews += 1;
    const dur = Number(row.duration);
    if (!Number.isNaN(dur)) durationMs += dur;
  }
  return {
    sessions: sessions.size,
    users: users.size,
    pageviews,
    engagedSessions: 0,
    engagementSeconds: Math.round(durationMs / 1000),
    keyEvents: 0,
    bounceRate: 0,
    conversions: 0,
  };
}

function pickNumber(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] != null) {
      const n = Number(obj[k]);
      if (!Number.isNaN(n)) return Math.round(n);
    }
  }
  return 0;
}

function collectEvents(list) {
  if (!list || list.error) return [];
  const rows = list.data || list.events || list.items || [];
  const counts = new Map();
  for (const row of rows) {
    const name = row.name || row.event_name || row.event;
    if (!name) continue;
    const prev = counts.get(name) || { name, count: 0, users: 0 };
    prev.count += 1;
    counts.set(name, prev);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

function breakdownToPages(chart) {
  if (!chart || chart.error) return [];
  const series = chart.data || chart.series || [];
  const rows = [];
  for (const s of series) {
    const path = pickBreakdown(s, ['path', 'url']);
    if (!path) continue;
    rows.push({
      path,
      pageviews: pickSeriesValue(s, ['count', 'value', 'screen_view']) || 0,
      users: pickSeriesValue(s, ['unique_visitors', 'visitors']) || 0,
      engagementSeconds: 0,
    });
  }
  return rows.sort((a, b) => b.pageviews - a.pageviews).slice(0, 15);
}

function breakdownToTraffic(chart) {
  if (!chart || chart.error) return [];
  const series = chart.data || chart.series || [];
  const rows = [];
  for (const s of series) {
    const source = pickBreakdown(s, ['utm_source', 'referrer']) || '(direct)';
    const medium = pickBreakdown(s, ['utm_medium']) || '(none)';
    rows.push({
      source,
      medium,
      sessions: pickSeriesValue(s, ['count', 'value', 'screen_view']) || 0,
      engagedSessions: pickSeriesValue(s, ['engaged_sessions']) || 0,
      keyEvents: pickSeriesValue(s, ['conversions']) || 0,
    });
  }
  return rows.sort((a, b) => b.sessions - a.sessions).slice(0, 15);
}

function pickBreakdown(series, keys) {
  const bd = series.breakdown || series.breakdowns || series.dimensions || {};
  for (const k of keys) {
    if (bd[k]) return bd[k];
  }
  return null;
}

function pickSeriesValue(series, keys) {
  for (const k of keys) {
    if (series[k] != null) return Number(series[k]);
    if (series.aggregations && series.aggregations[k] != null) return Number(series.aggregations[k]);
  }
  return 0;
}
