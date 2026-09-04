# ums-shared

Versioned, published artifacts consumed by the six UMS front-ends — never a dumping ground for
domain logic or UI components (that's [`ums-design-system`](https://github.com/ums-suite/ums-design-system)'s
job — see [ADR-0017](https://github.com/ums-suite/ums-platform/blob/main/docs/adr/0017-shared-design-system-package.md)).

Contains:

- The versioned OpenAPI contract for `ums-core`'s API (`contracts/ums-core.v1.json`) and its
  generated TypeScript client (`@ums/shared` → `projects/shared/src/lib/api`).
- Generic cross-cutting frontend utilities: auth-session helpers, localization plumbing,
  permission-check helpers, a correlation-id interceptor.

Full package README (consumption guide, what's implemented, known gaps):
[`projects/shared/README.md`](projects/shared/README.md).

## Status

Flow #7 (initial pass) — the OpenAPI contract + generated TypeScript client covers `ums-core`'s
current surface (Identity, Audit, Organization — Flows #4/#5/#6), plus the four cross-cutting
utility groups named above. See [`projects/shared/README.md`](projects/shared/README.md) for the
full breakdown and known gaps, and
[`ums-platform/PLATFORM_BLUEPRINT.md`](https://github.com/ums-suite/ums-platform/blob/main/PLATFORM_BLUEPRINT.md)
for what's still queued platform-wide.

## Local development

```bash
npm install                    # workspace install
npm run build                  # ng-packagr build of @ums/shared -> dist/shared
npm test                       # unit tests (Karma + Jasmine, headless Chrome)
npm run lint                   # ESLint, --max-warnings 0
npm run format:check           # Prettier --check
npm run contract:fetch         # re-fetch ums-core's live OpenAPI doc into contracts/ums-core.v1.json
npm run client:generate        # regenerate the TS client from the committed contract
npm run changeset               # record a semver-intent changeset for the next release
```
