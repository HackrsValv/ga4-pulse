# OpenPanel source

`ga4-pulse` supports [OpenPanel](https://openpanel.dev) as an alternative to GA4. Same one-page digest, different upstream — useful for cookieless / self-hosted analytics where you do not want GA4.

> **Status**: experimental. OpenPanel's Export API field names vary across versions; the adapter is defensive and degrades to zeros when fields aren't recognized. File issues against this repo if your project shape doesn't map.

## Prerequisites

- An OpenPanel project (cloud or self-hosted)
- A client credential pair with `read` or `root` access (the default `write` client cannot read)

## 1. Create read credentials

OpenPanel Cloud → project → Settings → Clients → **+ Add client** → **read** type. Copy `client_id` and `client_secret`.

Self-hosted: the same UI under `/settings/clients`.

## 2. Config

```yaml
source:
  type: openpanel
  project_id: 'proj_xxx'           # OpenPanel project ID
  api_url: 'https://api.openpanel.dev'   # default; override for self-hosted
  hostname_regex: 'mysite\.com$'   # optional

window: 24h
timezone: 'Europe/Vilnius'

sender:
  type: mailgun
  region: eu
  from: 'pulse@mysite.com'
  to: 'me@example.com'
```

## 3. Secrets

Set in GitHub Actions repo secrets (or local env for `ga4-pulse send`):

- `OPENPANEL_CLIENT_ID`
- `OPENPANEL_CLIENT_SECRET`

Optional:

- `OPENPANEL_API_URL` — overrides `source.api_url` (useful for self-hosted CI variants)
- `OPENPANEL_PROJECT_ID` — overrides `source.project_id`

## 4. Workflow

```yaml
- uses: HackrsValv/ga4-pulse@v1
  with:
    property-id: ''     # unused for openpanel; required input still defaults
    sender: mailgun
    from: 'pulse@mysite.com'
    to: 'me@example.com'
    config-path: 'pulse.config.yaml'   # easier to pass a checked-in config
  env:
    OPENPANEL_CLIENT_ID: ${{ secrets.OPENPANEL_CLIENT_ID }}
    OPENPANEL_CLIENT_SECRET: ${{ secrets.OPENPANEL_CLIENT_SECRET }}
    MAILGUN_API_KEY: ${{ secrets.MAILGUN_API_KEY }}
    MAILGUN_DOMAIN: ${{ secrets.MAILGUN_DOMAIN }}
    MAILGUN_REGION: eu
```

Use `config-path` because Action inputs don't currently expose every source field — committing `pulse.config.yaml` is cleaner.

## Auth mechanics

OpenPanel uses two custom headers (no Bearer/Basic prefix):

```
openpanel-client-id: <CLIENT_ID>
openpanel-client-secret: <CLIENT_SECRET>
```

Base URL: `https://api.openpanel.dev` (cloud) or your self-hosted host.

## Known limitations

- OpenPanel does not surface a built-in `bounceRate` metric in all versions; the pulse will show `0` if absent.
- `keyEvents` mapping: OpenPanel does not have a "key event" flag like GA4. The adapter uses `report.conversion_events` only.
- `engagementSeconds` may be `0` when OpenPanel returns no `engagement_seconds` or `avg_session_duration` field.

## Troubleshooting

| Error | Fix |
|---|---|
| `403 Forbidden` | Credentials are `write` type. Create a `read` or `root` client. |
| `404 project not found` | Wrong `project_id`. Find it in OpenPanel project settings. |
| `OPENPANEL_API_URL must be valid URL` | Self-hosted base URL must include scheme (`https://`). |
| Empty pages / traffic but events firing | Breakdown field names vary across OpenPanel versions. Try removing `hostname_regex` first; file an issue with your project's `/export/charts` sample response. |
