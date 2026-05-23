import { test } from 'node:test';
import assert from 'node:assert';
import { configSchema } from '../src/config/schema.mjs';

test('openpanel accepts endpoints + range_map + skip_charts overrides', () => {
  const cfg = configSchema.parse({
    source: {
      type: 'openpanel',
      project_id: 'proj_x',
      api_url: 'https://op.example.com',
      endpoints: {
        metrics: '/api/insights/{projectId}/metrics',
        charts: '/api/insights/{projectId}/charts',
        events: '/api/export/events',
      },
      range_map: { '7d': '7d', '24h': 'last24h' },
      skip_charts: true,
    },
    sender: { type: 'resend', from: 'a@b.com', to: 'c@d.com' },
  });
  assert.equal(cfg.source.endpoints.charts, '/api/insights/{projectId}/charts');
  assert.equal(cfg.source.range_map['7d'], '7d');
  assert.equal(cfg.source.skip_charts, true);
});

test('openpanel works without any overrides (uses defaults)', () => {
  const cfg = configSchema.parse({
    source: { type: 'openpanel', project_id: 'p' },
    sender: { type: 'slack-webhook', to: '#x' },
  });
  assert.equal(cfg.source.endpoints, undefined);
  assert.equal(cfg.source.range_map, undefined);
});
