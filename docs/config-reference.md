# pulse.config.yaml reference

Validated by Zod at runtime. The full commented schema lives in [`template/pulse.config.example.yaml`](../template/pulse.config.example.yaml).

## Top-level keys

| Key | Type | Default | Description |
|---|---|---|---|
| `ga4.property_id` | string | required | GA4 property ID (e.g. `'533218728'`) |
| `ga4.hostname_regex` | string | none | Partial regex filter on `hostName` dimension |
| `window` | `1h` \| `24h` \| `48h` \| `72h` \| `7d` \| `30d` | `24h` | Lookback window |
| `timezone` | IANA tz string | `UTC` | For date math and subject line |
| `subject_property_label` | string | derived | Overrides the property name in the subject |
| `report.sections` | array | all four | Subset of `headlines`, `usage`, `system`, `followups` |
| `report.bot_signature_threshold` | number 0-1 | `0.6` | Warn if (direct)/(none) > threshold |
| `report.conversion_events` | array | `[conversion, purchase, lead]` | Event names counted as conversions |
| `report.funnel_events` | array | `['page_view','cta_click','form_start','form_field_error']` | Event names shown in the Usage 'Event funnel' line; set to event names your analytics source actually emits (e.g. OpenPanel: `['screen_view','link_out']`) |
| `report.deadline.date` | YYYY-MM-DD | none | Countdown bullet in Followups |
| `report.deadline.label` | string | `'Deadline'` | Label for the countdown bullet |
| `sender.type` | enum | required | `mailgun`, `resend`, `sendgrid`, `smtp`, `slack-webhook` |
| `sender.region` | `us` \| `eu` | `us` | Mailgun only |
| `sender.from` | email | required for email | Sender address |
| `sender.to` | string or array | required | Recipient(s) |
| `sender.subject_prefix` | string | `''` | Prepends to subject line |

## Env var overrides

These env vars override values from the YAML at runtime:

- `GA4_PROPERTY_ID` — overrides `ga4.property_id`
- `PULSE_WINDOW` — overrides `window`
- `PULSE_TIMEZONE` — overrides `timezone`
- `PULSE_TO` — overrides `sender.to`
- `PULSE_FROM` — overrides `sender.from`

## Secret keys forbidden

The loader rejects YAML files containing keys named `api_key`, `apikey`, `password`, `token`, `secret`, `client_secret` at any depth. Secrets must come from env vars or GitHub secrets.
