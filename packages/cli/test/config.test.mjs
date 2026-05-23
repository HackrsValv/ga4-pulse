import { test } from 'node:test';
import assert from 'node:assert';
import { configSchema, rejectSecretsInConfig } from '../src/config/schema.mjs';

test('accepts legacy ga4 block + mailgun', () => {
  const cfg = configSchema.parse({
    ga4: { property_id: '123' },
    sender: { type: 'mailgun', region: 'eu', from: 'a@b.com', to: 'c@d.com' },
  });
  assert.equal(cfg.window, '24h');
  assert.equal(cfg.timezone, 'UTC');
  assert.equal(cfg.sender.type, 'mailgun');
  assert.equal(cfg.source.type, 'ga4');
  assert.equal(cfg.source.property_id, '123');
});

test('accepts typed ga4 source', () => {
  const cfg = configSchema.parse({
    source: { type: 'ga4', property_id: '999', hostname_regex: 'site\\.com$' },
    sender: { type: 'resend', from: 'a@b.com', to: 'c@d.com' },
  });
  assert.equal(cfg.source.type, 'ga4');
  assert.equal(cfg.source.property_id, '999');
  assert.equal(cfg.source.hostname_regex, 'site\\.com$');
});

test('accepts openpanel source', () => {
  const cfg = configSchema.parse({
    source: { type: 'openpanel', project_id: 'proj_abc' },
    sender: { type: 'slack-webhook', to: '#alerts' },
  });
  assert.equal(cfg.source.type, 'openpanel');
  assert.equal(cfg.source.project_id, 'proj_abc');
});

test('rejects unknown sender', () => {
  assert.throws(() =>
    configSchema.parse({
      ga4: { property_id: '123' },
      sender: { type: 'pigeon', to: 'x@y.com' },
    }),
  );
});

test('rejects unknown source type', () => {
  assert.throws(() =>
    configSchema.parse({
      source: { type: 'plausible', site: 'x.com' },
      sender: { type: 'resend', from: 'a@b.com', to: 'c@d.com' },
    }),
  );
});

test('rejects config with neither source nor ga4 block', () => {
  assert.throws(() =>
    configSchema.parse({
      sender: { type: 'resend', from: 'a@b.com', to: 'c@d.com' },
    }),
  );
});

test('refuses secret-looking keys', () => {
  assert.throws(
    () => rejectSecretsInConfig({ sender: { api_key: 'oops' } }),
    /refusing to read secret-looking key/,
  );
});

test('refuses secret keys at any depth', () => {
  assert.throws(
    () => rejectSecretsInConfig({ source: { type: 'openpanel', token: 'leak' } }),
    /refusing to read secret-looking key/,
  );
});
