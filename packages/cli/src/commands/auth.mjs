import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];
const REDIRECT_PORT = 8765;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

export async function authCommand(opts) {
  const { clientId, clientSecret } = await resolveCredentials(opts);

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  const codePromise = waitForCode();

  if (opts.browser !== false) {
    const { default: open } = await import('open');
    await open(url);
    console.log('Browser opened. If it did not, visit:');
  } else {
    console.log('Open this URL in a browser, authorize, then return here:');
  }
  console.log(url);
  console.log('');
  console.log('Waiting for callback on http://localhost:8765 ...');

  const code = await codePromise;
  const { tokens } = await oauth2.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      'No refresh_token returned. The client may already be authorized — revoke at https://myaccount.google.com/permissions and re-run.',
    );
  }

  console.log('');
  console.log('Success. Add these to your GitHub repo secrets (Settings → Secrets and variables → Actions):');
  console.log('');
  console.log(`  GA4_OAUTH_CLIENT_ID       = ${clientId}`);
  console.log(`  GA4_OAUTH_CLIENT_SECRET   = ${clientSecret}`);
  console.log(`  GA4_OAUTH_REFRESH_TOKEN   = ${tokens.refresh_token}`);
  console.log('');
  console.log('Refresh token is also valid locally — export the three vars to test `ga4-pulse send`.');
}

async function resolveCredentials(opts) {
  const file = opts.clientSecretFile;
  if (file) {
    const data = JSON.parse(await readFile(file, 'utf8'));
    const creds = data.installed || data.web;
    if (!creds) throw new Error(`Could not find OAuth client credentials in ${file}`);
    return { clientId: creds.client_id, clientSecret: creds.client_secret };
  }
  const clientId = opts.clientId || process.env.GA4_OAUTH_CLIENT_ID;
  const clientSecret = opts.clientSecret || process.env.GA4_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing OAuth client credentials. Pass --client-id/--client-secret, --client-secret-file, or set GA4_OAUTH_CLIENT_ID/GA4_OAUTH_CLIENT_SECRET.',
    );
  }
  return { clientId, clientSecret };
}

function waitForCode() {
  return new Promise((resolveCb, rejectCb) => {
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        if (error) {
          res.writeHead(400, { 'content-type': 'text/plain' });
          res.end(`OAuth error: ${error}`);
          server.close();
          rejectCb(new Error(`OAuth error: ${error}`));
          return;
        }
        if (!code) {
          res.writeHead(400, { 'content-type': 'text/plain' });
          res.end('Missing code');
          return;
        }
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<h1>Authorized.</h1><p>You can close this tab.</p>');
        server.close();
        resolveCb(code);
      } catch (err) {
        rejectCb(err);
      }
    });
    server.listen(REDIRECT_PORT);
  });
}
