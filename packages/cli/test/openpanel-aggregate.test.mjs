import { test } from 'node:test';
import assert from 'node:assert';
import { aggregate } from '../src/sources/openpanel/aggregate.mjs';

const dateRange = { startDate: 'yesterday', endDate: 'yesterday', label: '2026-05-31' };

function evRows() {
  return [
    { name: 'screen_view', sessionId: 's1', profileId: 'u1', duration: 1000 },
    { name: 'screen_view', sessionId: 's1', profileId: 'u1', duration: 2000 },
    { name: 'screen_view', sessionId: 's2', profileId: 'u2', duration: 0 },
    { name: 'session_end', sessionId: 's2', profileId: 'u2', duration: 3000 },
    { name: 'lead', sessionId: 's2', profileId: 'u2' },
  ];
}

test('uses insights when metrics returns usable numbers', () => {
  const reports = { metrics: { sessions: 42, visitors: 30, pageviews: 100 }, eventsList: { data: evRows() }, dateRange };
  const data = aggregate(reports, { report: {}, source: { type: 'openpanel' } });
  assert.equal(data.totals.sessions, 42);
  assert.equal(data.totals.users, 30);
  assert.equal(data.totals.pageviews, 100);
  assert.equal(data.diagnostics.headlines_source, 'insights');
});

test('falls back to events-derived headlines when insights 404s', () => {
  const reports = { metrics: { error: 'OpenPanel 404 GET /api/insights/p/overview' }, eventsList: { data: evRows() }, dateRange };
  const data = aggregate(reports, { report: { conversion_events: ['lead'] }, source: { type: 'openpanel' } });
  assert.equal(data.totals.sessions, 2, 'distinct sessionId');
  assert.equal(data.totals.users, 2, 'distinct profileId');
  assert.equal(data.totals.pageviews, 3, 'screen_view count');
  assert.equal(data.totals.conversions, 1, 'lead count');
  assert.equal(data.diagnostics.headlines_source, 'events');
  assert.ok(data.warnings.some((w) => w.includes('headlines derived from /export/events')));
  assert.ok(!data.warnings.some((w) => w.startsWith('OpenPanel metrics:')), 'no raw alarm when fallback succeeds');
});

test('events-fallback reports the trailing instant window, not the calendar date', () => {
  const reports = {
    metrics: { error: 'OpenPanel 404 GET /api/insights/p/overview' },
    eventsList: { data: evRows() },
    dateRange,
    diagnostics: { window_instant: { start: '2026-05-31T12:00:00.000Z', end: '2026-06-01T12:00:00.000Z' } },
  };
  const data = aggregate(reports, { report: {}, source: { type: 'openpanel' }, window: '24h' });
  assert.equal(data.window.start, '2026-05-31T12:00:00.000Z');
  assert.equal(data.window.end, '2026-06-01T12:00:00.000Z');
  assert.equal(data.window.label, 'trailing 24h');
});

test('skip_insights sentinel derives from events with no metrics warning', () => {
  const reports = { metrics: { skipped: true }, eventsList: { data: evRows() }, dateRange };
  const data = aggregate(reports, { report: {}, source: { type: 'openpanel', skip_insights: true } });
  assert.equal(data.diagnostics.headlines_source, 'events');
  assert.equal(data.totals.sessions, 2);
  assert.ok(!data.warnings.some((w) => w.toLowerCase().includes('insights')));
});

test('honors source.pageview_event override', () => {
  const reports = { metrics: { skipped: true }, eventsList: { data: [
    { name: 'pageview', sessionId: 's1', profileId: 'u1' },
    { name: 'screen_view', sessionId: 's1', profileId: 'u1' },
  ] }, dateRange };
  const data = aggregate(reports, { report: {}, source: { type: 'openpanel', pageview_event: 'pageview' } });
  assert.equal(data.totals.pageviews, 1);
});

test('surfaces a capped warning', () => {
  const reports = { metrics: { skipped: true }, eventsList: { data: evRows(), capped: true }, dateRange };
  const data = aggregate(reports, { report: {}, source: { type: 'openpanel' } });
  assert.ok(data.warnings.some((w) => w.includes('page cap reached')));
});
