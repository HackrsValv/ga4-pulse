import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

export function buildAuthClient() {
  // Prefer service-account JSON if present (matches existing ga4-data API patterns; useful for
  // migrations from earlier SA-based pipelines). Falls through to OAuth refresh token otherwise.
  if (process.env.GA4_SERVICE_ACCOUNT_JSON) {
    let credentials;
    try {
      credentials = JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON);
    } catch (err) {
      throw new Error(`GA4_SERVICE_ACCOUNT_JSON is not valid JSON: ${err.message}`, { cause: err });
    }
    return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  }

  const clientId = process.env.GA4_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GA4_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GA4_OAUTH_REFRESH_TOKEN;
  if (clientId && clientSecret && refreshToken) {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    return oauth2;
  }

  throw new Error(
    'Missing GA4 auth. Set GA4_SERVICE_ACCOUNT_JSON, OR all three of GA4_OAUTH_CLIENT_ID, GA4_OAUTH_CLIENT_SECRET, GA4_OAUTH_REFRESH_TOKEN. Run `ga4-pulse auth` to mint OAuth credentials.',
  );
}

// Kept for back-compat with v0.1.x consumers.
export const buildOAuthClient = buildAuthClient;

export function buildAnalyticsDataClient() {
  return google.analyticsdata({ version: 'v1beta', auth: buildAuthClient() });
}
