import { test } from 'node:test';
import assert from 'node:assert';
import { windowToInstantRange } from '../src/util/date.mjs';

test('windowToInstantRange returns trailing ISO bounds', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');
  const r = windowToInstantRange('24h', now);
  assert.equal(r.end, '2026-06-01T12:00:00.000Z');
  assert.equal(r.start, '2026-05-31T12:00:00.000Z');
});

test('windowToInstantRange handles 7d and 1h', () => {
  const now = new Date('2026-06-08T00:00:00.000Z');
  assert.equal(windowToInstantRange('7d', now).start, '2026-06-01T00:00:00.000Z');
  assert.equal(windowToInstantRange('1h', now).start, '2026-06-07T23:00:00.000Z');
});

test('windowToInstantRange throws on unknown window', () => {
  assert.throws(() => windowToInstantRange('5y', new Date('2026-06-01T00:00:00.000Z')), /Unknown window/);
});
