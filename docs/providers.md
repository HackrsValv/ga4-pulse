# Sender providers

> Looking for analytics sources (GA4 vs OpenPanel)? See [oauth-setup.md](oauth-setup.md) for GA4 and [openpanel-setup.md](openpanel-setup.md) for OpenPanel. This page covers the email/webhook side only.


## Mailgun

```yaml
sender:
  type: mailgun
  region: eu        # or 'us'
  from: 'pulse@verified-domain.com'
  to: 'me@example.com'
```

Env (required):
- `MAILGUN_API_KEY` — private key from Mailgun → Settings → API Keys
- `MAILGUN_DOMAIN` — your verified sending domain
- `MAILGUN_REGION` (optional) — `us` (default) or `eu`. Overrides `region` in config if set.

Common errors:
- `401` → wrong API key, OR using US endpoint with EU key (or vice versa)
- `400 unverified sender` → `from` is not on the verified domain

## Resend

```yaml
sender:
  type: resend
  from: 'pulse@verified-domain.com'
  to: 'me@example.com'
```

Env:
- `RESEND_API_KEY` — from Resend dashboard

## SendGrid

```yaml
sender:
  type: sendgrid
  from: 'pulse@verified-sender.com'
  to: 'me@example.com'
```

Env:
- `SENDGRID_API_KEY` — Single Send permission is enough

`from` must be a verified Single Sender or domain.

## SMTP

```yaml
sender:
  type: smtp
  from: 'pulse@example.com'
  to: 'me@example.com'
```

Env:
- `SMTP_URL` — full connection URL, e.g. `smtps://user:password@smtp.example.com:465`

Uses [nodemailer](https://nodemailer.com/) under the hood. For Gmail: create an [App Password](https://myaccount.google.com/apppasswords), then `smtps://you@gmail.com:apppassword@smtp.gmail.com:465`.

## Slack webhook

```yaml
sender:
  type: slack-webhook
  to: '#alerts'      # informational only; the webhook URL hardcodes the channel
```

Env:
- `SLACK_WEBHOOK_URL` — Incoming Webhook URL

Slack receives the Markdown rendition (not HTML). The pulse becomes a single message with the subject as the bold header.
