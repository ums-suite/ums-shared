---
'@ums/shared': minor
---

Initial OpenAPI TypeScript client generated against ums-core's Identity/Audit/Organization
surface (Flows #4/#5/#6), plus the four generic cross-cutting utility groups ADR-0017 charters
this package with: auth-session helpers (token storage, Bearer attachment, single-flighted
refresh-on-401 matching IDN-6's rotation semantics), localization plumbing (`LocaleService` +
`?lang=`/`Accept-Language` interceptor), permission-check helpers (JWT-derived role checks, plus
pure permission-list checks), and a correlation-id interceptor matching
`UMS.Shared.Observability`'s header name. First release -- no existing API surface changed.
