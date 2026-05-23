# ga4-pulse

> Daily GA4 pulse digests, delivered. Email, webhook, or markdown — no service-account dance.

[![npm](https://img.shields.io/npm/v/@hackrsvalv/ga4-pulse?label=npm)](https://www.npmjs.com/package/@hackrsvalv/ga4-pulse)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)
[![CI](https://github.com/HackrsValv/ga4-pulse/actions/workflows/ci.yml/badge.svg)](https://github.com/HackrsValv/ga4-pulse/actions/workflows/ci.yml)

`ga4-pulse` turns your Google Analytics 4 property into a daily one-page digest delivered wherever you read mail or chat. Bring your own GA4 property + sender (Mailgun, Resend, SendGrid, SMTP, Slack). Skip the service-account-on-property-binding pain — OAuth refresh token only.

## What you get

- **One-page pulse**: sessions, users, top pages, traffic sources, conversion funnel, followups
- **Multi-sender**: Mailgun (EU/US), Resend, SendGrid, generic SMTP, Slack webhook
- **OAuth refresh token auth** — no GA4 admin UI dance, no sensitive scope verification
- **GitHub Action**: `uses: HackrsValv/ga4-pulse@v1` in any workflow
- **Template-repo ready**: `gh repo create --template HackrsValv/ga4-pulse-template`
- **`ga4-pulse setup`**: drops a working workflow + config into any existing repo

## Quickstart

```sh
# 1. One-time OAuth flow (browser opens)
npx @hackrsvalv/ga4-pulse auth

# 2. Scaffold workflow + config into your repo
npx @hackrsvalv/ga4-pulse setup

# 3. Add GitHub secrets (CLI prints exactly what to paste)
#    GA4_OAUTH_CLIENT_ID, GA4_OAUTH_CLIENT_SECRET, GA4_OAUTH_REFRESH_TOKEN
#    plus sender-specific (e.g. MAILGUN_API_KEY)

# 4. Smoke-test
gh workflow run pulse-email.yml -f dry_run=true
```

First scheduled fire lands next morning per the cron in `.github/workflows/pulse-email.yml`.

## CLI

```sh
ga4-pulse auth          # OAuth refresh-token flow
ga4-pulse send          # query GA4 + render + send
ga4-pulse dry-run       # write pulse-report.{html,md} to CWD; no send
ga4-pulse setup         # scaffold workflow + pulse.config.yaml in CWD
ga4-pulse --version
```

## GitHub Action

```yaml
- uses: HackrsValv/ga4-pulse@v1
  with:
    property-id: '533218728'
    hostname-regex: 'mysite\.com$'
    window: 24h
    sender: mailgun
    from: 'pulse@mysite.com'
    to: 'me@example.com'
    timezone: 'Europe/Vilnius'
  env:
    GA4_OAUTH_CLIENT_ID: ${{ secrets.GA4_OAUTH_CLIENT_ID }}
    GA4_OAUTH_CLIENT_SECRET: ${{ secrets.GA4_OAUTH_CLIENT_SECRET }}
    GA4_OAUTH_REFRESH_TOKEN: ${{ secrets.GA4_OAUTH_REFRESH_TOKEN }}
    MAILGUN_API_KEY: ${{ secrets.MAILGUN_API_KEY }}
    MAILGUN_DOMAIN: ${{ secrets.MAILGUN_DOMAIN }}
    MAILGUN_REGION: eu
```

Full input reference in [docs/action-reference.md](docs/action-reference.md).

## Docs

- [Quickstart](docs/quickstart.md) — 10-step setup, zero to first email
- [OAuth setup (GA4)](docs/oauth-setup.md) — Google Cloud Console walkthrough
- [OpenPanel source](docs/openpanel-setup.md) — alternative analytics upstream (experimental)
- [Providers](docs/providers.md) — sender-specific configuration
- [Config reference](docs/config-reference.md) — `pulse.config.yaml` schema
- [Troubleshooting](docs/troubleshooting.md) — common errors and fixes

## Why OAuth refresh token (not service account)?

GA4 admin UI rejects `*.iam.gserviceaccount.com` emails as users since 2025. The `analytics.manage.users` scope needed to bind service accounts via API is gated behind app verification for non-Google OAuth clients. Refresh token from your own user (Testing-mode consent screen, no verification needed) sidesteps the entire mess.

Tradeoff: refresh token has the same access as the user. Don't share it. Rotate via `ga4-pulse auth` if compromised.

## License

[AGPL-3.0-or-later](LICENSE). If you run a modified version as a service, share your changes.

## Acknowledgments

Extracted from the [vaikutreneris.lt](https://vaikutreneris.lt) daily pulse pipeline. Built to scratch our own itch — running it on your own property is a one-shot setup.
