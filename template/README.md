# ga4-pulse scaffolded files

`ga4-pulse setup` just dropped:

- `.github/workflows/pulse-email.yml` — daily cron + manual dispatch
- `pulse.config.yaml` — config (edit me)
- `docs/ga4-pulse-setup.md` — this file

## Next steps

1. **Edit `pulse.config.yaml`** — fill in `property_id`, `hostname_regex`, `sender`, `from`, `to`.
2. **Mint OAuth refresh token**: run `npx @hackrsvalv/ga4-pulse auth` (browser flow). It prints the three secret values.
3. **Add GitHub secrets** (Settings → Secrets and variables → Actions):
   - `GA4_OAUTH_CLIENT_ID`
   - `GA4_OAUTH_CLIENT_SECRET`
   - `GA4_OAUTH_REFRESH_TOKEN`
   - Plus sender-specific (e.g. `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`)
4. **Smoke-test**: `gh workflow run pulse-email.yml -f dry_run=true`. Download artifact, eyeball.
5. **Real run**: `gh workflow run pulse-email.yml` or wait for cron.

Full docs: https://github.com/HackrsValv/ga4-pulse
