import { test } from 'node:test';
import assert from 'node:assert';
import { buildRequestPlan, resolveRange, fetchAllEvents } from '../src/sources/openpanel/queries.mjs';

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

test('buildRequestPlan no longer includes an events descriptor', () => {
  const plan = buildRequestPlan({ projectId: 'p', range: '7d', source: {} });
  assert.equal(plan.events, undefined);
});

test('fetchAllEvents pages through all pages and accumulates rows', async () => {
  const pages = {
    1: { meta: { totalCount: 3, pages: 2, current: 1 }, data: [{ sessionId: 'a' }, { sessionId: 'b' }] },
    2: { meta: { totalCount: 3, pages: 2, current: 2 }, data: [{ sessionId: 'c' }] },
  };
  const calls = [];
  const client = { request: async (path, { query }) => { calls.push(query.page); return pages[query.page]; } };
  const r = await fetchAllEvents(client, { path: '/export/events', projectId: 'p', start: 's', end: 'e' });
  assert.deepEqual(calls, [1, 2]);
  assert.equal(r.data.length, 3);
  assert.equal(r.totalCount, 3);
  assert.equal(r.capped, false);
});

test('fetchAllEvents respects maxPages cap and flags capped', async () => {
  const client = { request: async (_p, { query }) => ({ meta: { totalCount: 999, pages: 99, current: query.page }, data: [{ sessionId: String(query.page) }] }) };
  const r = await fetchAllEvents(client, { path: '/export/events', projectId: 'p', start: 's', end: 'e', maxPages: 3 });
  assert.equal(r.capped, true);
  assert.equal(r.data.length, 3);
});

test('fetchAllEvents passes start/end/limit and stops on empty batch', async () => {
  let seen;
  const client = { request: async (_p, { query }) => { seen = query; return { meta: { pages: 1 }, data: [] }; } };
  const r = await fetchAllEvents(client, { path: '/export/events', projectId: 'p', start: 'S', end: 'E' });
  assert.equal(seen.start, 'S');
  assert.equal(seen.end, 'E');
  assert.equal(seen.limit, 1000);
  assert.equal(r.data.length, 0);
});

test('skip_charts yields null chart plans', () => {
  const plan = buildRequestPlan({ projectId: 'p', range: '7d', source: { skip_charts: true } });
  assert.equal(plan.pages, null);
  assert.equal(plan.traffic, null);
});
