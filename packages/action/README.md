# GA4 Pulse Action

GitHub composite Action that wraps `@hackrsvalv/ga4-pulse`.

## Usage

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
    dry-run: ${{ inputs.dry_run }}
  env:
    GA4_OAUTH_CLIENT_ID: ${{ secrets.GA4_OAUTH_CLIENT_ID }}
    GA4_OAUTH_CLIENT_SECRET: ${{ secrets.GA4_OAUTH_CLIENT_SECRET }}
    GA4_OAUTH_REFRESH_TOKEN: ${{ secrets.GA4_OAUTH_REFRESH_TOKEN }}
    MAILGUN_API_KEY: ${{ secrets.MAILGUN_API_KEY }}
    MAILGUN_DOMAIN: ${{ secrets.MAILGUN_DOMAIN }}
    MAILGUN_REGION: eu
```

See [docs/action-reference.md](../../docs/action-reference.md) for the full input list.
