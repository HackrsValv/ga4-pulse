# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-05-23

### Added
- Initial release.
- `@hackrsvalv/ga4-pulse` CLI with `auth`, `send`, `dry-run`, `setup` commands.
- OAuth refresh-token authentication (no service-account dance required).
- Senders: Mailgun (EU/US), Resend, SendGrid, generic SMTP, Slack webhook.
- GitHub composite Action at `packages/action`.
- Template repo files for one-shot scaffolding via `ga4-pulse setup`.
- Documentation: quickstart, OAuth setup, providers, troubleshooting.

[Unreleased]: https://github.com/HackrsValv/ga4-pulse/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/HackrsValv/ga4-pulse/releases/tag/v0.1.0
