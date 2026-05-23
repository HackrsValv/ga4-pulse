import { test } from 'node:test';
import assert from 'node:assert';
import { buildAuthClient } from '../src/sources/ga4/auth.mjs';

function withEnv(env, fn) {
  const prev = {};
  for (const k of Object.keys(env)) {
    prev[k] = process.env[k];
    if (env[k] == null) delete process.env[k];
    else process.env[k] = env[k];
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v == null) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test('throws when neither SA nor OAuth env vars are set', () => {
  withEnv(
    {
      GA4_SERVICE_ACCOUNT_JSON: null,
      GA4_OAUTH_CLIENT_ID: null,
      GA4_OAUTH_CLIENT_SECRET: null,
      GA4_OAUTH_REFRESH_TOKEN: null,
    },
    () => {
      assert.throws(() => buildAuthClient(), /Missing GA4 auth/);
    },
  );
});

test('returns GoogleAuth instance when service-account JSON is set', () => {
  const sa = JSON.stringify({
    type: 'service_account',
    project_id: 'p',
    private_key_id: 'k',
    private_key: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
    client_email: 'pulse@p.iam.gserviceaccount.com',
    client_id: '0',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
  });
  withEnv({ GA4_SERVICE_ACCOUNT_JSON: sa }, () => {
    const client = buildAuthClient();
    assert.equal(client.constructor.name, 'GoogleAuth');
  });
});

test('returns OAuth2 client when OAuth env vars are set', () => {
  withEnv(
    {
      GA4_SERVICE_ACCOUNT_JSON: null,
      GA4_OAUTH_CLIENT_ID: 'cid',
      GA4_OAUTH_CLIENT_SECRET: 'sec',
      GA4_OAUTH_REFRESH_TOKEN: 'rtok',
    },
    () => {
      const client = buildAuthClient();
      assert.equal(client.constructor.name, 'OAuth2Client');
    },
  );
});

test('rejects malformed service-account JSON with clear error', () => {
  withEnv({ GA4_SERVICE_ACCOUNT_JSON: '{not json' }, () => {
    assert.throws(() => buildAuthClient(), /not valid JSON/);
  });
});
