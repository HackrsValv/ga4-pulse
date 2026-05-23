# OAuth setup

ga4-pulse prefers an OAuth refresh token for GA4 reads, but also accepts a service-account JSON (`GA4_SERVICE_ACCOUNT_JSON` env var) if you already have one provisioned. OAuth is recommended for new setups because GA4 admin UI rejects service-account emails as users since 2025, and the `analytics.manage.users` scope needed to bind SAs via API is verification-gated for non-Google OAuth clients — see [troubleshooting.md](troubleshooting.md) for the Apps Script workaround.

If `GA4_SERVICE_ACCOUNT_JSON` is set, ga4-pulse uses it. Otherwise it falls through to OAuth.

This walkthrough takes ~5 minutes.

## 1. Pick or create a GCP project

Any GCP project will do. Reuse an existing one if you have one. https://console.cloud.google.com → project picker.

Note the project ID for reference.

## 2. Enable the Google Analytics Data API

https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com → **Enable**.

## 3. OAuth consent screen (External, Testing mode)

https://console.cloud.google.com/apis/credentials/consent

- User type: **External**
- App name: `ga4-pulse-yourname` (anything)
- User support email + developer email: your address
- Add **Test users** → your own email
- **Scopes** → Add `https://www.googleapis.com/auth/analytics.readonly`
- **Publishing status**: leave on **Testing** (no verification needed for up to 100 test users)

## 4. Create the OAuth client

https://console.cloud.google.com/apis/credentials

- **Create credentials** → **OAuth client ID**
- Application type: **Desktop app**
- Name: `ga4-pulse`
- Click **Create**
- Download the JSON → save as `client_secret.json`

## 5. Mint the refresh token

```sh
npx @hackrsvalv/ga4-pulse auth --client-secret-file ./client_secret.json
```

The CLI:

1. Starts a local HTTP listener on `localhost:8765`
2. Opens your browser to the Google consent page
3. After you click through (you'll see "This app isn't verified" — that's fine in Testing mode, click Advanced → Go to → Allow)
4. Captures the callback code and exchanges it for a refresh token
5. Prints the three secret values

Copy them into wherever you store secrets — GitHub repo, password manager, env file.

## Refresh token longevity

In Testing mode, refresh tokens expire after **7 days**. To extend indefinitely, switch the OAuth consent screen to **Production**. Production status requires nothing extra for non-sensitive scopes, but `analytics.readonly` is classified as sensitive → Google may require app verification. For internal/personal use, staying in Testing and re-running `ga4-pulse auth` weekly is acceptable.

Alternative: use the workspace-level OAuth consent screen if you have a Google Workspace org (Internal mode skips verification entirely).

## Troubleshooting

See [troubleshooting.md](troubleshooting.md) for common errors.
