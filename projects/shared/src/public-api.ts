/*
 * Public API Surface of @ums/shared
 */

// Generated OpenAPI TypeScript client (Identity/Audit/Organization -- see api/README.md and this
// package's own README "Refreshing the API client"). Re-exported from a sub-barrel so a consumer
// can also `import { ... } from '@ums/shared/api'` if the build setup prefers a narrower entry
// point; the root barrel below re-exports the same members for the common case.
export * from './lib/api';

// Auth-session helpers (token storage, Bearer attachment, refresh rotation)
export * from './lib/auth/auth.config';
export * from './lib/auth/auth.types';
export * from './lib/auth/auth.interceptor';
export * from './lib/auth/auth-refresh-coordinator.service';
export * from './lib/auth/token-storage.service';

// Localization plumbing
export * from './lib/localization/locale.types';
export * from './lib/localization/locale.service';
export * from './lib/localization/locale.interceptor';

// Permission-check helpers
export * from './lib/permissions/jwt.util';
export * from './lib/permissions/current-user.service';
export * from './lib/permissions/permission.util';

// Correlation-id propagation
export * from './lib/correlation/correlation-id.constants';
export * from './lib/correlation/correlation-id.interceptor';

// Error envelope normalization
export * from './lib/errors/problem-details';
export * from './lib/errors/error-mapping.util';
