/**
 * `UMS.Shared.Observability.Correlation.CorrelationIdContext.HeaderName` in ums-core -- the exact
 * header name its `CorrelationIdMiddleware` reads on the way in and always echoes on the way out.
 * Keep this literal in sync with that constant; it is the wire contract between this interceptor
 * and every UMS.Host module's observability pipeline.
 */
export const CorrelationIdContext = {
  HeaderName: 'X-Correlation-Id',
} as const;
