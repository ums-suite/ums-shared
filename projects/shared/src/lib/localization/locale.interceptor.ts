import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LocaleService } from './locale.service';

/**
 * Propagates the active {@link LocaleService} locale to every outgoing API call as:
 *
 * - the `?lang=` query parameter -- the convention ums-core's Organization module endpoints
 *   actually implement today (`FacultyEndpoints`, `DepartmentEndpoints`, `ProgramEndpoints`,
 *   `DesignationEndpoints`, `HierarchyEndpoints`, ... each bind a `string? lang` query parameter
 *   and resolve `{table}_translations` rows against it server-side, ADR-0011). Appending it
 *   unconditionally is safe against modules that don't read it -- ASP.NET Core minimal-API route
 *   handlers with no matching parameter simply ignore an unrecognized query string key.
 * - the standard `Accept-Language` header, for forward-compatibility with any future module/
 *   middleware that resolves language from the header instead of a query parameter
 *   (ums-conventions.md's own phrasing: "resolved server-side against the caller's
 *   `Accept-Language`/profile-preference") -- ums-core does not read this header today (verified:
 *   no `Accept-Language` reference anywhere in ums-core's source), so it is currently inert but
 *   harmless.
 *
 * Skips requests that already carry an explicit `lang` query parameter (a caller intentionally
 * requesting a specific language for one call, overriding the ambient locale).
 */
export const localeInterceptor: HttpInterceptorFn = (req, next) => {
  const locale = inject(LocaleService).locale();

  if (req.params.has('lang')) {
    return next(req);
  }

  return next(
    req.clone({
      setParams: { lang: locale },
      setHeaders: { 'Accept-Language': locale },
    }),
  );
};
