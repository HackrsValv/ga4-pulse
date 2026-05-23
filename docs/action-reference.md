# Action input reference

All inputs and env vars accepted by `HackrsValv/ga4-pulse@v1`.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `property-id` | yes | — | GA4 property ID |
| `hostname-regex` | no | `''` | `hostName` partial regex |
| `window` | no | `24h` | `1h\|24h\|48h\|72h\|7d\|30d` |
| `timezone` | no | `UTC` | IANA timezone |
| `sender` | yes | — | `mailgun\|resend\|sendgrid\|smtp\|slack-webhook` |
| `from` | conditional | `''` | Required for email senders |
| `to` | conditional | `''` | Required for email senders |
| `subject-prefix` | no | `''` | e.g. `[STAGING]` |
| `dry-run` | no | `false` | Skip send; upload `pulse-report.{html,md}` artifact |
| `version` | no | `latest` | Pin a specific `@hackrsvalv/ga4-pulse` version |
| `config-path` | no | `''` | Use a checked-in `pulse.config.yaml` instead of inputs |

## Env (passed via `env:` block)

OAuth (always required):
- `GA4_OAUTH_CLIENT_ID`
- `GA4_OAUTH_CLIENT_SECRET`
- `GA4_OAUTH_REFRESH_TOKEN`

Sender-specific (set what you use):
- `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_REGION`
- `RESEND_API_KEY`
- `SENDGRID_API_KEY`
- `SMTP_URL`
- `SLACK_WEBHOOK_URL`

## Example

```yaml
- uses: HackrsValv/ga4-pulse@v1
  with:
    property-id: '533218728'
    hostname-regex: 'mysite\.com$'
    window: 24h
    timezone: 'Europe/Vilnius'
    sender: mailgun
    from: 'pulse@mysite.com'
    to: 'me@example.com'
  env:
    GA4_OAUTH_CLIENT_ID: ${{ secrets.GA4_OAUTH_CLIENT_ID }}
    GA4_OAUTH_CLIENT_SECRET: ${{ secrets.GA4_OAUTH_CLIENT_SECRET }}
    GA4_OAUTH_REFRESH_TOKEN: ${{ secrets.GA4_OAUTH_REFRESH_TOKEN }}
    MAILGUN_API_KEY: ${{ secrets.MAILGUN_API_KEY }}
    MAILGUN_DOMAIN: ${{ secrets.MAILGUN_DOMAIN }}
    MAILGUN_REGION: eu
```
