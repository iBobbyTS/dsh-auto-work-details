# Development

## Build and distribution checks

Use Node 24.11.0 and the `packageManager` pnpm version for maintenance. `pnpm install --frozen-lockfile` prepares development dependencies. `pnpm typecheck` checks Host and Client separately; `pnpm build:runtime` refreshes generated `lib/`; `pnpm test` builds an isolated candidate before testing; `pnpm check:dist` independently rebuilds and compares all artifacts, then packs and tests clean tarball/Git installation. `pnpm check` combines these with one candidate build. Installation uses prebuilt JS; it runs no plugin compiler lifecycle hook.

Automated/source checks target DSH 0.2.2-rc.1. Desktop interaction and real user accounts remain separate validation.
