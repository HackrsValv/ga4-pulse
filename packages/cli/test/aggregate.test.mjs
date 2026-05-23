import { test } from 'node:test';
import assert from 'node:assert';
import { aggregate } from '../src/sources/ga4/aggregate.mjs';

function fakeOverall(rows) {
  return {
    metricHeaders: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'screenPageViews' },
      { name: 'engagedSessions' },
      { name: 'userEngagementDuration' },
      { name: 'bounceRate' },
      { name: 'keyEvents' },
    ],
    rows,
  };
}

test('aggregate sums apex+www', () => {
  const reports = {
    overall: fakeOverall([
      {
        dimensionValues: [{ value: 'example.com' }],
        metricValues: [{ value: '167' }, { value: '152' }, { value: '401' }, { value: '156' }, { value: '2579' }, { value: '0.07' }, { value: '0' }],
      },
      {
        dimensionValues: [{ value: 'www.example.com' }],
        metricValues: [{ value: '6' }, { value: '5' }, { value: '9' }, { value: '3' }, { value: '2' }, { value: '0.5' }, { value: '0' }],
      },
    ]),
    events: { rows: [] },
    pages: { rows: [] },
    traffic: { rows: [] },
    dateRange: { startDate: 'yesterday', endDate: 'yesterday', label: '2026-05-22' },
  };
  const data = aggregate(reports, { report: {} });
  assert.equal(data.totals.sessions, 173);
  assert.equal(data.totals.users, 157);
  assert.equal(data.totals.pageviews, 410);
});

test('aggregate handles empty reports', () => {
  const empty = { metricHeaders: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'engagedSessions' }, { name: 'userEngagementDuration' }, { name: 'bounceRate' }, { name: 'keyEvents' }], rows: [] };
  const data = aggregate({ overall: empty, events: {}, pages: {}, traffic: {}, dateRange: { startDate: 'yesterday', endDate: 'yesterday' } }, { report: {} });
  assert.equal(data.totals.sessions, 0);
  assert.equal(data.totals.users, 0);
});
