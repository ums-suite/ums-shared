---
'@ums/shared': minor
---

Regenerated the OpenAPI TypeScript client against ums-core's now-complete backend (all 18
UMS.Modules), replacing the stale Identity/Audit/Organization-only snapshot (41 paths) taken back
when those were the only modules built. The new `contracts/ums-core.v1.json` has 359 paths across
Identity, Audit, Organization, Documents, Notifications, Faculty, Student, Academic, Learning,
Finance, Admission, Hostel, Library, Content, Research, Alumni, Career, and Reporting, and
`projects/shared/src/lib/api/generated/` now ships one `*ApiService` per module.

Propagating this contract to the six `ums-*-web` frontend apps (updating each app's vendored
`@ums/shared` tarball and potentially replacing hand-written interim API clients with the now-real
generated ones) is a separate, not-yet-done follow-up -- out of scope here.
