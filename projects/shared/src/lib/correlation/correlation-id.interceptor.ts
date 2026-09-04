import type { HttpInterceptorFn } from '@angular/common/http';
import { CorrelationIdContext } from './correlation-id.constants';

/**
 * Attaches a fresh `X-Correlation-Id` to every outgoing request that doesn't already carry one
 * (a consumer that already generated one further upstream, e.g. to correlate a whole user
 * action across several calls, always wins). ums-core's `CorrelationIdMiddleware` reads this
 * exact header, folds it into every structured log/trace for the request
 * (ums-conventions.md Observability: "every module's structured logs/traces carry
 * `correlationId`"), and echoes it back on the response -- this is also the field
 * {@link toUmsApiError} surfaces from a failed response so a bug report can be traced straight
 * back to the server-side log line that produced it.
 *
 * Register before {@link authInterceptor} in the interceptor chain (order in
 * `provideHttpClient(withInterceptors([...]))`) so a 401-triggered retry still carries a
 * correlation id on its very first attempt -- see this package's README "Wiring it up".
 */
export const correlationIdInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has(CorrelationIdContext.HeaderName)) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { [CorrelationIdContext.HeaderName]: generateCorrelationId() },
    }),
  );
};

function generateCorrelationId(): string {
  const globalCrypto = typeof crypto !== 'undefined' ? crypto : undefined;
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }

  // Fallback for environments without a global `crypto.randomUUID` (e.g. older test runners) --
  // not cryptographically strong, but a correlation id only needs to be unique-enough, not secret.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
