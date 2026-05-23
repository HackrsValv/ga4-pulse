import { test } from 'node:test';
import assert from 'node:assert';
import { configSchema, rejectSecretsInConfig } from '../src/config/schema.mjs';

test('accepts minimal mailgun config', () => {
  const cfg = configSchema.parse({
    ga4: { property_id: '123' },
    sender: { type: 'mailgun', region: 'eu', from: 'a@b.com', to: 'c@d.com' },
  });
  assert.equal(cfg.window, '24h');
  assert.equal(cfg.timezone, 'UTC');
  assert.equal(cfg.sender.type, 'mailgun');
});

test('rejects unknown sender', () => {
  assert.throws(() =>
    configSchema.parse({
      ga4: { property_id: '123' },
      sender: { type: 'pigeon', to: 'x@y.com' },
    }),
  );
});

test('refuses secret-looking keys', () => {
  assert.throws(
    () => rejectSecretsInConfig({ sender: { api_key: 'oops' } }),
    /refusing to read secret-looking key/,
  );
});
