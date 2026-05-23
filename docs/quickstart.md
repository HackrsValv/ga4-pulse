# Quickstart

Zero to first scheduled pulse in about 10 minutes.

## Prerequisites

- A GA4 property you can read
- A sender account (Mailgun/Resend/SendGrid/SMTP/Slack webhook)
- Node 22+
- `gh` CLI authenticated

## 1. Create the OAuth client

Walkthrough in [oauth-setup.md](oauth-setup.md). End state:

- GCP project (any)
- OAuth consent screen in Testing mode, you added as test user, scope `https://www.googleapis.com/auth/analytics.readonly`
- OAuth client (Desktop app) created → `client_secret.json` downloaded

## 2. Mint a refresh token

```sh
npx @hackrsvalv/ga4-pulse auth --client-secret-file ./client_secret.json
```

Browser opens → consent → CLI prints `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`.

## 3. Scaffold into your repo

```sh
cd path/to/your/repo
npx @hackrsvalv/ga4-pulse setup
```

This drops `.github/workflows/pulse-email.yml` + `pulse.config.yaml`.

## 4. Edit `pulse.config.yaml`

At minimum:

```yaml
ga4:
  property_id: '533218728'
  hostname_regex: 'mysite\.com$'
sender:
  type: mailgun
  region: eu
  from: 'pulse@mysite.com'
  to: 'me@example.com'
```

## 5. Add GitHub secrets

```sh
gh secret set GA4_OAUTH_CLIENT_ID
gh secret set GA4_OAUTH_CLIENT_SECRET
gh secret set GA4_OAUTH_REFRESH_TOKEN
gh secret set MAILGUN_API_KEY
gh secret set MAILGUN_DOMAIN -b 'mysite.com'
```

(Or paste in the GitHub UI.)

## 6. Smoke-test

```sh
gh workflow run pulse-email.yml -f dry_run=true
gh run watch
```

Download the `pulse-report` artifact, open `pulse-report.html`. If it looks right:

## 7. Go live

```sh
gh workflow run pulse-email.yml
```

Check your inbox. Next scheduled fire is tomorrow per the cron in the workflow file.

## Troubleshooting

If anything failed, see [troubleshooting.md](troubleshooting.md).
