import { test } from 'node:test';
import assert from 'node:assert';
import { sources, resolveSource } from '../src/sources/index.mjs';

test('sources registry exposes ga4 and openpanel', () => {
  assert.ok(sources.ga4, 'ga4 source missing');
  assert.ok(sources.openpanel, 'openpanel source missing');
  assert.equal(typeof sources.ga4.runReports, 'function');
  assert.equal(typeof sources.openpanel.runReports, 'function');
});

test('resolveSource defaults to ga4', () => {
  const s = resolveSource({});
  assert.equal(s.type, 'ga4');
});

test('resolveSource picks openpanel', () => {
  const s = resolveSource({ source: { type: 'openpanel', project_id: 'x' } });
  assert.equal(s.type, 'openpanel');
});

test('resolveSource throws for unknown', () => {
  assert.throws(() => resolveSource({ source: { type: 'fathom' } }), /Unknown analytics source/);
});
