# ums-shared

Versioned, published artifacts consumed by the six UMS front-ends — never a dumping ground for domain logic or UI components (that's [`ums-design-system`](https://github.com/ums-suite/ums-design-system)'s job — see [ADR-0017](https://github.com/ums-suite/ums-platform/blob/main/docs/adr/0017-shared-design-system-package.md)).

Contains:
- The versioned OpenAPI contract for `ums-core`'s API and its generated TypeScript client.
- Generic cross-cutting frontend utilities: auth-session helpers, localization plumbing, permission-check helpers.

## Status

Scaffolded; content is generated alongside `ums-core`'s API surface as each backend module is built — see [`ums-platform/PLATFORM_BLUEPRINT.md`](https://github.com/ums-suite/ums-platform/blob/main/PLATFORM_BLUEPRINT.md).
