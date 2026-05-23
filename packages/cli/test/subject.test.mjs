import { test } from 'node:test';
import assert from 'node:assert';
import { buildSubject } from '../src/compose/subject.mjs';

test('builds subject with timezone-aware date (legacy ga4 path)', () => {
  const config = {
    window: '24h',
    timezone: 'UTC',
    ga4: { property_id: '123', hostname_regex: 'example\\.com$' },
    source: { type: 'ga4', property_id: '123', hostname_regex: 'example\\.com$' },
    sender: { subject_prefix: '' },
  };
  const data = { window: { label: '2026-05-22' } };
  const subject = buildSubject(config, data);
  assert.match(subject, /example\.com pulse — 2026-05-22 \(24h\)/);
});

test('respects subject prefix', () => {
  const config = {
    window: '7d',
    timezone: 'UTC',
    ga4: { property_id: '123' },
    source: { type: 'ga4', property_id: '123' },
    sender: { subject_prefix: '[STAGING]' },
    subject_property_label: 'mysite',
  };
  const data = { window: { label: '7d window' } };
  const subject = buildSubject(config, data);
  assert.match(subject, /^\[STAGING\] mysite pulse — 7d window \(7d\)/);
});

test('handles openpanel source label', () => {
  const config = {
    window: '24h',
    timezone: 'UTC',
    source: { type: 'openpanel', project_id: 'proj_abc', hostname_regex: 'foo\\.com$' },
    sender: {},
  };
  const data = { window: { label: '2026-05-22' } };
  const subject = buildSubject(config, data);
  assert.match(subject, /foo\.com pulse — 2026-05-22 \(24h\)/);
});
