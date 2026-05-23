export function aggregate(reports, config) {
  const overall = sumRows(reports.overall, ['sessions', 'activeUsers', 'screenPageViews', 'engagedSessions', 'userEngagementDuration', 'keyEvents']);
  const bounceRate = weightedBounce(reports.overall);

  const events = (reports.events.rows || []).map((row) => ({
    name: row.dimensionValues[0].value,
    count: parseInt(row.metricValues[0].value || '0', 10),
    users: parseInt(row.metricValues[1].value || '0', 10),
  }));

  const eventMap = Object.fromEntries(events.map((e) => [e.name, e]));

  const pages = (reports.pages.rows || [])
    .map((row) => ({
      path: row.dimensionValues[0].value,
      pageviews: parseInt(row.metricValues[0].value || '0', 10),
      users: parseInt(row.metricValues[1].value || '0', 10),
      engagementSeconds: parseInt(row.metricValues[2].value || '0', 10),
    }))
    .sort((a, b) => b.pageviews - a.pageviews);

  const traffic = (reports.traffic.rows || [])
    .map((row) => ({
      source: row.dimensionValues[0].value,
      medium: row.dimensionValues[1].value,
      sessions: parseInt(row.metricValues[0].value || '0', 10),
      engagedSessions: parseInt(row.metricValues[1].value || '0', 10),
      keyEvents: parseFloat(row.metricValues[2].value || '0'),
    }))
    .sort((a, b) => b.sessions - a.sessions);

  const conversionEvents = config.report?.conversion_events || ['conversion', 'purchase', 'lead'];
  const conversions = conversionEvents.reduce(
    (sum, name) => sum + (eventMap[name]?.count || 0),
    0,
  );

  return {
    totals: {
      sessions: overall.sessions,
      users: overall.activeUsers,
      pageviews: overall.screenPageViews,
      engagedSessions: overall.engagedSessions,
      engagementSeconds: overall.userEngagementDuration,
      keyEvents: overall.keyEvents,
      bounceRate,
      conversions,
    },
    hosts: (reports.overall.rows || []).map((row) => ({
      host: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value || '0', 10),
    })),
    events,
    eventMap,
    pages,
    traffic,
    window: {
      start: reports.dateRange.startDate,
      end: reports.dateRange.endDate,
      label: reports.dateRange.label,
    },
  };
}

function sumRows(report, metrics) {
  const out = Object.fromEntries(metrics.map((m) => [m, 0]));
  for (const row of report.rows || []) {
    report.metricHeaders.forEach((header, i) => {
      if (metrics.includes(header.name)) {
        out[header.name] += parseFloat(row.metricValues[i].value || '0');
      }
    });
  }
  for (const m of metrics) out[m] = Math.round(out[m]);
  return out;
}

function weightedBounce(report) {
  let totalSessions = 0;
  let weighted = 0;
  for (const row of report.rows || []) {
    const sessionsIdx = report.metricHeaders.findIndex((h) => h.name === 'sessions');
    const bounceIdx = report.metricHeaders.findIndex((h) => h.name === 'bounceRate');
    const sessions = parseFloat(row.metricValues[sessionsIdx].value || '0');
    const bounce = parseFloat(row.metricValues[bounceIdx].value || '0');
    totalSessions += sessions;
    weighted += sessions * bounce;
  }
  return totalSessions > 0 ? weighted / totalSessions : 0;
}
