# Contributing to ga4-pulse

Thanks for your interest. This repo is small; contributions are welcome.

## Setup

```sh
git clone https://github.com/HackrsValv/ga4-pulse
cd ga4-pulse
npm install
```

## Branches & commits

- Branch from `main`, name `task/<slug>` or `fix/<slug>`.
- Use [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `chore:`, etc.

## PR checklist

- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] CHANGELOG updated under `[Unreleased]`
- [ ] Docs updated if user-facing surface changed

## Releases

Maintainers bump `packages/cli/package.json` version, update CHANGELOG, tag `vX.Y.Z` on `main`. The release workflow publishes to npm and creates the GitHub release.

## License

By contributing, you agree your work is licensed under AGPL-3.0-or-later, matching the project.
