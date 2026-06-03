import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregate } from '../src/sources/openpanel/aggregate.mjs';

const dateRange = { startDate: 'yesterday', endDate: 'yesterday', label: '2026-05-31' };

function reports(overrides = {}) {
  return {
    metrics: { skipped: true },
    eventsList: {
      data: [
        { name: 'screen_view', sessionId: 's1', profileId: 'u1', path: '/', referrerName: 'google', referrerType: 'search' },
        { name: 'screen_view', sessionId: 's1', profileId: 'u1', path: '/', referrerName: 'google', referrerType: 'search' },
        { name: 'screen_view', sessionId: 's2', profileId: 'u2', path: '/' },
        { name: 'screen_view', sessionId: 's2', profileId: 'u2', path: '/start/' },
      ],
    },
    pagesChart: { error: 'skipped', data: [] },
    trafficChart: { error: 'skipped', data: [] },
    dateRange,
    diagnostics: {},
    ...overrides,
  };
}

function config(source = {}) {
  return {
    window: '24h',
    source: { type: 'openpanel', pageview_event: 'screen_view', ...source },
    report: {},
  };
}

test('keeps pages and traffic empty when charts_from_events is unset and charts are unavailable', () => {
  const data = aggregate(reports(), config());

  assert.deepEqual(data.pages, []);
  assert.deepEqual(data.traffic, []);
});

test('derives pages and traffic from events when charts_from_events is true and charts are unavailable', () => {
  const data = aggregate(reports(), config({ charts_from_events: true }));

  assert.deepEqual(data.pages[0], {
    path: '/',
    pageviews: 3,
    users: 2,
    engagementSeconds: 0,
  });
  assert.ok(data.pages.some((page) => page.path === '/start/' && page.pageviews === 1 && page.users === 1));

  assert.ok(data.traffic.some((row) => row.source === 'google' && row.medium === 'search' && row.sessions === 1));
  assert.ok(data.traffic.some((row) => row.source === '(direct)' && row.medium === '(none)' && row.sessions === 1));
});

test('uses usable charts over events-derived pages when charts_from_events is true', () => {
  const data = aggregate(
    reports({
      pagesChart: {
        data: [{ breakdown: { path: '/from-chart/' }, count: 9, unique_visitors: 4 }],
      },
    }),
    config({ charts_from_events: true }),
  );

  assert.deepEqual(data.pages, [
    {
      path: '/from-chart/',
      pageviews: 9,
      users: 4,
      engagementSeconds: 0,
    },
  ]);
});

test('uses calm derived warnings instead of raw chart errors when charts_from_events is true', () => {
  const data = aggregate(reports(), config({ charts_from_events: true }));

  assert.ok(data.warnings.some((warning) => warning === 'OpenPanel pages derived from /export/events (charts unavailable)'));
  assert.ok(!data.warnings.some((warning) => warning === 'OpenPanel pages: skipped'));
});
