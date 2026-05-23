# Troubleshooting

## OAuth / GA4

| Error | Likely cause | Fix |
|---|---|---|
| `Missing OAuth env vars` | secrets not set or not exposed to workflow | Add three `GA4_OAUTH_*` secrets + reference them in `env:` block |
| `403 PERMISSION_DENIED` on `runReport` | OAuth user lacks GA4 property access | Add the user to GA4 admin → Property Access Management (Viewer is enough) |
| `403 ACCESS_TOKEN_SCOPE_INSUFFICIENT` | refresh token minted without `analytics.readonly` scope | Re-run `ga4-pulse auth` ensuring the consent screen lists Analytics |
| `400 invalid_grant` | refresh token expired (Testing mode = 7-day expiry) | Re-run `ga4-pulse auth`. To stop expiry, switch consent screen to Production. |
| `404 SERVICE_DISABLED` | Analytics Data API not enabled in the GCP project | https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com → Enable |
| `This app is blocked` during `ga4-pulse auth` | OAuth client is in Production with unverified sensitive scope | Keep consent screen in Testing OR get app verified |
| Empty rows but you know there's traffic | `hostname_regex` over-restrictive | Lower regex or remove; verify `hostName` values in GA4 explore |

## Mailgun

| Error | Fix |
|---|---|
| `401` | Wrong API key OR wrong region (EU key on `api.mailgun.net` or vice versa). Set `MAILGUN_REGION=eu` for EU. |
| `400 unverified sender` | `from` not on a verified domain. Add the domain to Mailgun + complete DNS. |
| `400 sandbox` | Free sandbox domain only sends to authorized recipients. Add `to` address to Mailgun → Authorized Recipients, or use a real domain. |

## Resend

| Error | Fix |
|---|---|
| `401` | `RESEND_API_KEY` missing or wrong |
| `422 validation` | `from` domain not verified. Verify in Resend dashboard. |

## SendGrid

| Error | Fix |
|---|---|
| `401` | API key wrong or lacks `mail.send` permission |
| `403 from not verified` | Verify Single Sender or full domain in SendGrid |

## SMTP

| Error | Fix |
|---|---|
| `EAUTH` | Wrong username/password. For Gmail, use [App Password](https://myaccount.google.com/apppasswords) not your account password. |
| `ETIMEOUT` | Firewall blocking port. Try `smtp://...:587` (STARTTLS) instead of `smtps://...:465` (TLS). |

## Slack webhook

| Error | Fix |
|---|---|
| `404` | Webhook URL revoked. Recreate in Slack → App → Incoming Webhooks. |
| `invalid_payload` | Pulse markdown contains characters Slack rejects. Open a GitHub issue with the report. |

## Workflow

| Symptom | Fix |
|---|---|
| `workflow_dispatch` only works after first push to default branch | GitHub limitation. Merge the workflow to `main` first, then dispatch. |
| Dry-run artifact empty | Pulse threw before write. Check workflow logs for stderr. |
| Cron not firing | Default branch only. Workflow file must exist on `main`. GitHub also delays unused schedules — manually trigger once to warm. |
