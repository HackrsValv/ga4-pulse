# Security policy

## Reporting

Report vulnerabilities via [GitHub Security Advisory](https://github.com/HackrsValv/ga4-pulse/security/advisories/new).

Do **not** open public issues for security-sensitive matters.

## Supported versions

| Version | Supported |
|---------|-----------|
| latest minor (`0.1.x`) | ✅ |
| older  | ❌ |

## Scope

- Secret handling in the CLI and Action
- OAuth token handling and storage
- Input validation in config and sender modules
- Dependency vulnerabilities

Out of scope: misconfiguration of your own GCP, Mailgun, or GitHub account; ad-blockers; downstream consumer code.
