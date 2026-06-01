# OpenPanel source

`ga4-pulse` supports [OpenPanel](https://openpanel.dev) as an alternative to GA4. Same one-page digest, different upstream — useful for cookieless / self-hosted analytics where you do not want GA4.

> **Status**: experimental. OpenPanel's Export API field names vary across versions; the adapter is defensive and degrades to zeros when fields aren't recognized. File issues against this repo if your project shape doesn't map.

## Prerequisites

- An OpenPanel project (cloud or self-hosted)
- A client credential pair with `read` or `root` access (the default `write` client cannot read)

## 1. Create read credentials

OpenPanel Cloud → project → Settings → Clients → **+ Add client** → **read** type. Copy `client_id` and `client_secret`.

Self-hosted: the same UI under `/settings/clients`.

> **Copy `client_secret` immediately — it cannot be retrieved later.** OpenPanel stores secrets in `<32hex>.<64hex>` hash form (salt + sha256) and only shows the raw plain-text value **once at creation**. If you lose it, delete the client and create a new one — the secret cannot be recovered from any UI surface or API response.

### `project_id` format

OpenPanel project IDs are arbitrary string identifiers — on cloud they may look like `proj_xxx`, on self-hosted they are often the project slug (e.g. `mysite`). Both formats are valid. Pass whatever your OpenPanel instance returns as `project.id`. Note that ga4-pulse can auto-resolve this if your client is scoped to a single project — see "project_id is optional" below.

## 2. Config

```yaml
source:
  type: openpanel
  # project_id is optional. Omit if your read client is scoped to a single project —
  # ga4-pulse auto-resolves it via GET /manage/projects. Set explicitly only when one
  # client has access to multiple projects.
  # project_id: 'proj_xxx'
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
- **Pages + traffic breakdowns** use `GET /export/charts` with query parameters (`projectId`, `range`, `event=screen_view`, `breakdown=path|utm_source`). If your deployment's `export.router` shape differs, override with `source.endpoints.charts` or set `source.skip_charts: true`.
- The Export API (`/export/events`) requires credentials with the `read` or `root` scope, not the default `write` scope. If you see `401 Invalid client id` from `/export/events` but `/insights/{projectId}/metrics` works, your client has only `write` access — provision a new client with at least `read`.
- When `/insights/{projectId}/overview` is unavailable (404) or `skip_insights` is set, sessions/users/pageviews are derived from the paged `/export/events` stream (distinct `sessionId` / `profileId`, `screen_view` count); a page-cap warning appears if pagination is truncated.
- Windows `48h` and `72h` are mapped to OpenPanel's `7d` range by default. Override via `source.range_map` or switch your `window` to `7d` explicitly.

Valid OpenPanel ranges (verified 2026-05-23 against api.openpanel.dev): `30min`, `lastHour`, `last24h`, `today`, `yesterday`, `7d`, `30d`, `3m`, `6m`, `12m`, `monthToDate`, `lastMonth`, `yearToDate`, `lastYear`, `custom`. Cross-check your deployment's enum.

## Advanced: override endpoints and range mapping

OpenPanel's HTTP surface drifts between releases and self-hosted forks. Defaults match cloud as of 2026-05-23; everything is overridable per-deployment:

```yaml
source:
  type: openpanel
  project_id: 'proj_xxx'
  api_url: 'https://my-self-hosted.example.com'
  endpoints:
    metrics: '/api/insights/{projectId}/metrics'   # default: /insights/{projectId}/metrics
    charts:  '/api/insights/{projectId}/charts'    # default: /export/charts
    events:  '/api/export/events'                  # default: /export/events
  range_map:
    24h: 'last24h'                                  # override only the keys you need
    7d:  '7d'
  skip_charts: false                                # set true if your deployment has no chart endpoint
  skip_insights: false        # set true if your deployment has no /insights router; headlines come from /export/events
  pageview_event: screen_view # event name counted as a pageview when deriving headlines from events
  events_max_pages: 20        # safety cap on /export/events pagination (20 * 1000 events)
```

`{projectId}` is substituted at request time. Anything you omit falls back to the documented default.

## Troubleshooting

| Error | Fix |
|---|---|
| `403 Forbidden` | Credentials are `write` type. Create a `read` or `root` client. |
| `404 project not found` | Wrong `project_id`. Find it in OpenPanel project settings. |
| `OPENPANEL_API_URL must be valid URL` | Self-hosted base URL must include scheme (`https://`). |
| Empty pages / traffic but events firing | Breakdown field names vary across OpenPanel versions. Try removing `hostname_regex` first; file an issue with your project's `/export/charts` sample response. |
