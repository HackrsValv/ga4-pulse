import { test } from 'node:test';
import assert from 'node:assert';
import { buildRequestPlan, resolveRange } from '../src/sources/openpanel/queries.mjs';

const VALID = new Set([
  '30min', 'lastHour', 'today', 'yesterday', '7d', '30d', '6m', '12m',
  'monthToDate', 'lastMonth', 'yearToDate', 'lastYear', 'custom',
]);

test('resolveRange maps every default window to a valid timeWindows enum', () => {
  for (const w of ['1h', '24h', '48h', '72h', '7d', '30d']) {
    assert.ok(VALID.has(resolveRange(w, {})), `${w} -> invalid enum`);
  }
});

test('resolveRange never emits last24h for 24h window', () => {
  assert.notEqual(resolveRange('24h', {}), 'last24h');
  assert.equal(resolveRange('24h', {}), 'today');
});

test('resolveRange falls back to 30d for unknown window', () => {
  assert.equal(resolveRange('999d', {}), '30d');
});

test('resolveRange honors a valid range_map override', () => {
  assert.equal(resolveRange('24h', { range_map: { '24h': 'yesterday' } }), 'yesterday');
});

test('resolveRange rejects an invalid range_map override, falls back to 30d', () => {
  assert.equal(resolveRange('24h', { range_map: { '24h': 'last24h' } }), '30d');
});

test('charts send events as JSON array of {name} objects', () => {
  const plan = buildRequestPlan({ projectId: 'infrawei', range: 'today', source: {} });
  assert.deepEqual(JSON.parse(plan.pages.query.events), [{ name: 'screen_view' }]);
  assert.deepEqual(JSON.parse(plan.traffic.query.events), [{ name: 'screen_view' }]);
});

test('charts send breakdowns (plural) as JSON array of {name}, no singular keys', () => {
  const plan = buildRequestPlan({ projectId: 'infrawei', range: 'today', source: {} });
  assert.deepEqual(JSON.parse(plan.pages.query.breakdowns), [{ name: 'path' }]);
  assert.deepEqual(JSON.parse(plan.traffic.query.breakdowns), [{ name: 'utm_source' }]);
  assert.equal(plan.pages.query.breakdown, undefined);
  assert.equal(plan.pages.query.event, undefined);
});

test('source.chart_event overrides the charted event name', () => {
  const plan = buildRequestPlan({ projectId: 'p', range: '7d', source: { chart_event: 'pageview' } });
  assert.deepEqual(JSON.parse(plan.pages.query.events), [{ name: 'pageview' }]);
});

test('events request carries no range param (/export/events ignores range)', () => {
  const plan = buildRequestPlan({ projectId: 'p', range: '7d', source: {} });
  assert.equal(plan.events.query.range, undefined);
  assert.equal(plan.events.query.projectId, 'p');
});

test('skip_charts yields null chart plans', () => {
  const plan = buildRequestPlan({ projectId: 'p', range: '7d', source: { skip_charts: true } });
  assert.equal(plan.pages, null);
  assert.equal(plan.traffic, null);
});
