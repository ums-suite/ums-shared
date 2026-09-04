# @ums/shared

The versioned OpenAPI TypeScript client for `ums-core`'s API, plus generic cross-cutting frontend
utilities, consumed by all six UMS front-ends
(`ums-public-web`, `ums-admission-web`, `ums-student-web`, `ums-faculty-web`, `ums-admin-web`,
`ums-alumni-web`) per [ADR-0017](https://github.com/ums-suite/ums-platform/blob/main/docs/adr/0017-shared-design-system-package.md).

**What this package is not** (ADR-0017): it never accumulates UI components — that's
[`@ums/design-system`](https://github.com/ums-suite/ums-design-system)'s job — or domain logic,
which belongs in the owning app. There is no SCSS/stylesheet layer here at all.

## Consuming this package

```bash
npm install @ums/shared
```

### The generated API client

Three `@Injectable({ providedIn: 'root' })` service classes, one per module currently exposed by
ums-core's OpenAPI document: `IdentityApiService`, `AuditApiService`, `OrganizationApiService`
(41 operations total — see `src/lib/api/generated/README.md`'s own per-operation listing, written
by the generator itself).

```ts
import { IdentityApiService, provideApi, type UmsTokenPair } from '@ums/shared';
// or, narrower: import { IdentityApiService } from '@ums/shared/api';

// Bootstrap (app.config.ts):
providers: [
  provideApi(environment.umsCoreBaseUrl), // sets BASE_PATH for every generated *ApiService
  // ...
];

// Anywhere:
const identity = inject(IdentityApiService);
identity
  .apiV1IdentityAuthLoginPost({ identifier: 'jdoe', password: '...' })
  .subscribe((pair: UmsTokenPair) => tokenStorage.setTokens(pair));
```

**Known gap: request bodies are typed, response bodies mostly are not.** None of ums-core's
minimal-API endpoints currently declare an explicit response type (no `.Produces<T>()`/typed
`Results<...>` return signature — verified: every operation's OpenAPI `responses.200` is bodyless
metadata, `{"description": "OK"}`, no `content`/schema), so every generated method's return type
is `Observable<any>`, not the actual DTO. This is a real ums-core limitation, not something this
package can fix by regenerating — it needs endpoint-level annotation on the backend. Until then,
consumers should assert/cast to a known shape by hand where it matters (as `UmsTokenPair` does
above for the two Auth operations, hand-authored in `src/lib/auth/auth.types.ts` against the real
`TokenPairResult` wire shape ums-core actually returns) rather than trust the generated `any`.

`src/lib/api/generated/` is **committed, generator-produced code — never hand-edit it**; a stray
manual edit is silently discarded the next time `npm run client:generate` wipes and regenerates
the directory (see "Refreshing the API client" below and `src/lib/api/index.ts`'s own header
comment). Operation names are the generator's default (auto-derived from the OpenAPI path, since
none of ums-core's endpoints currently declare an explicit `operationId`) — not hand-picked, and
they will change if ums-core adds one later.

### Auth-session helpers (IDN-5/IDN-6/IDN-7/IDN-8)

```ts
import {
  authInterceptor,
  correlationIdInterceptor,
  localeInterceptor,
  UMS_AUTH_CONFIG,
  TokenStorageService,
} from '@ums/shared';

// app.config.ts
providers: [
  { provide: UMS_AUTH_CONFIG, useValue: { baseUrl: environment.umsCoreBaseUrl } },
  provideHttpClient(
    withInterceptors([correlationIdInterceptor, localeInterceptor, authInterceptor]),
  ),
];
```

- `TokenStorageService` owns the current access/refresh token pair (in-memory signal, persisted
  best-effort to `localStorage`). Call `setTokens(pair)` after a successful
  `POST /api/v1/identity/auth/login` (via the generated `AuthApiService`); read
  `isAuthenticated()`/`sessionId()` reactively anywhere.
- `authInterceptor` attaches `Authorization: Bearer <accessToken>` to every request except
  `auth/login`/`auth/refresh`, and on a `401` single-flights exactly one
  `POST /api/v1/identity/auth/refresh` (via `AuthRefreshCoordinator`) and retries the original
  request once with the rotated token — matching IDN-6's single-use rotation semantics
  (`ums-core/tests/UMS.Modules.Identity.IntegrationTests/Auth/RefreshTests.cs`): concurrent 401s
  never each fire their own refresh call, which would otherwise trip reuse detection and revoke
  the whole Session.
- `TokenStorageService.sessionExpired$` fires when a refresh genuinely fails (expired/reused/
  revoked refresh token) — subscribe to redirect to login without polling.
- Logout itself (`POST /api/v1/identity/auth/logout` / `/logout-all`) is a normal generated-client
  call the app makes and then calls `TokenStorageService.clear()` on success — this package does
  not wrap it in an "AuthService" facade, to stay out of domain/flow logic per ADR-0017.

### Localization plumbing (ADR-0011)

```ts
import { LocaleService, localeInterceptor } from '@ums/shared';

const locale = inject(LocaleService);
locale.setLocale('bn');
```

`localeInterceptor` appends `?lang=<locale>` to every request — the actual convention
Organization's endpoints implement today (`FacultyEndpoints`, `DepartmentEndpoints`,
`ProgramEndpoints`, `DesignationEndpoints`, `HierarchyEndpoints`; server-side resolves
`{table}_translations` rows against it with English fallback, ADR-0011) — plus the standard
`Accept-Language` header for forward compatibility (verified: no `ums-core` module reads
`Accept-Language` today, so the header is currently inert but harmless). `LocaleService` persists
the choice to `localStorage`; English (`'en'`) is the default and the platform-wide fallback.
UI strings/validation messages are **not** this package's job — standard Angular i18n, per ADR-0011.

### Permission-check helpers

```ts
import { CurrentUserService, hasPermission } from '@ums/shared';

const currentUser = inject(CurrentUserService);
currentUser.hasRole('Registrar'); // role membership, from the JWT's `roles` claim
hasPermission(myResolvedPermissions, 'organization.faculty.write'); // pure check against a resolved list
```

- `CurrentUserService` derives `userId`/`sessionId`/`roles` live from the current access token's
  claims (`sub`/`sid`/`roles` — `UMS.Shared.Authorization.UmsClaimTypes`), with `hasRole`/
  `hasAnyRole` role-membership checks.
- `hasPermission`/`hasAnyPermission`/`hasAllPermissions` are pure functions over an
  already-resolved `grantedPermissions: string[]` — **not** derived from the JWT. See "Known gap"
  below for why.
- `decodeJwtPayload` is the underlying (unverified — verification is ums-core's job, not the
  client's) JWT decoder, exported for anything needing a raw claim this service doesn't surface.

**Known gap: permission resolution.** Identity's access token carries Role _names_ only (`sub`,
`sid`, `roles` — verified against `JwtTokenService.IssueAccessToken` in ums-core), not a resolved
Permission set, and there is currently no `GET /api/v1/identity/users/me/permissions`-shaped
endpoint a client could call to resolve "my effective permissions" (the closest existing
endpoints — `GET /permissions` for the catalog, `GET /roles` for Role definitions — both require
`identity.role.manage`/`identity.permission.read`, which an ordinary authenticated user won't
have). Until Identity adds such an endpoint, a consuming app either does its own role-name-based
UI gating via `hasRole`/`hasAnyRole`, or resolves a permission list some other way (e.g. an
admin-only screen that already has catalog access) and passes it into `hasPermission`. This is
flagged in the Flow #7 plan row, not silently worked around.

### Correlation-id interceptor

```ts
import { correlationIdInterceptor } from '@ums/shared';
```

Attaches a fresh `X-Correlation-Id` (matching `UMS.Shared.Observability.Correlation.
CorrelationIdContext.HeaderName` exactly) to every outgoing request that doesn't already carry
one. `toUmsApiError` (below) reads the same header back off a failed response as a fallback when
the ProblemDetails body itself didn't carry a `correlationId`.

### Error envelope normalization

```ts
import { toUmsApiError } from '@ums/shared';

this.someApiService.doThing().subscribe({
  error: (err) => {
    const apiError = toUmsApiError(err); // { status, message, code?, correlationId?, problemDetails? }
  },
});
```

Every UMS.Host module returns the same `ProblemDetails`-based envelope
(`UMS.Shared.ErrorHandling`: `code`/`message`(`title`)/`correlationId`) for both unhandled
exceptions and Result-pattern domain errors — `toUmsApiError` normalizes either shape (plus a
genuine network/infrastructure failure with no response at all) into one `UmsApiError`, so no
consumer re-parses `HttpErrorResponse.error` by hand.

## Refreshing the API client

This is the real, one-command workflow every future flow that adds a new `UMS.Modules` surface
should follow — never a manual one-off edit of generated code:

```bash
# 1. Bring up ums-core (from ums-devops):
scripts/dev-up.sh
# 2. Run the Host (from ums-core), if dev-up.sh's own container isn't what you want to generate against:
dotnet run --project src/Host
# 3. From this repo, re-fetch the live OpenAPI document:
npm run contract:fetch          # writes contracts/ums-core.v1.json (UMS_CORE_BASE_URL env var to override the host)
# 4. Regenerate the TypeScript client from the committed contract:
npm run client:generate         # wipes + regenerates src/lib/api/generated/
# 5. Review the diff, update src/lib/api/index.ts if new export groups are needed, then:
npm run build && npm test
```

## What this package currently implements

| Area                                   | Status                                                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| OpenAPI contract + generated TS client | Covers Identity, Audit, Organization (Flows #4/#5/#6) — 41 operations. Regenerate as later modules land.        |
| Auth-session helpers                   | Token storage, Bearer attachment, single-flighted refresh-on-401 matching IDN-6 rotation semantics.             |
| Localization plumbing                  | `LocaleService` + `?lang=`/`Accept-Language` interceptor, English fallback.                                     |
| Permission-check helpers               | Role-membership checks from the JWT; permission checks against a caller-supplied resolved list (see gap above). |
| Correlation-id interceptor             | `X-Correlation-Id` generation/propagation, matching `UMS.Shared.Observability`'s header name exactly.           |

**Known gaps** (also recorded in `release/DEVELOPMENT_PLAN.md` row 7):

- Generated response bodies are `Observable<any>`, not typed DTOs — ums-core's endpoints don't
  declare `.Produces<T>()`/typed `Results<...>` return signatures yet (see "The generated API
  client" above). A backend-side fix, not something a client-side regeneration can work around.
- Permission resolution from the JWT alone is not possible today (see above) — Identity has no
  "my effective permissions" endpoint yet.
- The generated client's TOTP MFA / password-reset surfaces don't exist because Identity itself
  hasn't built them yet (IDN-10/11/12/16/17, still queued per `DEVELOPMENT_PLAN.md` row 4).
- `contracts/ums-core.v1.json` is a point-in-time snapshot; it must be regenerated (see above) as
  Notifications, Documents, Faculty, and every later module land.
