import { HttpErrorResponse } from '@angular/common/http';
import { CorrelationIdContext } from '../correlation/correlation-id.constants';
import type { UmsApiError, UmsProblemDetails } from './problem-details';

/**
 * Normalizes a failed HTTP call into a {@link UmsApiError}, regardless of whether the failure was
 * a server-returned ProblemDetails body (the common case, ums-conventions.md "consistent envelope
 * ... so the generated TypeScript client in ums-shared never special-cases one module's response
 * shape against another's") or a genuine client-side/network failure (no response at all).
 */
export function toUmsApiError(error: unknown): UmsApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      status: 0,
      message: error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }

  if (error.error === null || typeof error.error !== 'object') {
    // A non-JSON or empty body -- infrastructure failure (proxy/gateway error, CORS, connection
    // reset) rather than a ums-core ProblemDetails response.
    return {
      status: error.status,
      message: error.message || 'A network error occurred.',
      correlationId: error.headers?.get(CorrelationIdContext.HeaderName) ?? undefined,
    };
  }

  const body = error.error as Partial<UmsProblemDetails>;
  // `title` is RFC 7807's field name (never declared on UmsProblemDetails itself -- only reachable
  // via its index signature, hence bracket access under `noPropertyAccessFromIndexSignature`).
  const title = body['title'];
  const problemDetails: UmsProblemDetails = {
    ...body,
    message:
      (typeof title === 'string' ? title : undefined) ??
      body.message ??
      error.message ??
      'An unexpected error occurred.',
  } as UmsProblemDetails;

  return {
    status: error.status,
    message: problemDetails.message,
    code: typeof body.code === 'string' ? body.code : undefined,
    correlationId:
      typeof body.correlationId === 'string'
        ? body.correlationId
        : (error.headers?.get(CorrelationIdContext.HeaderName) ?? undefined),
    problemDetails,
  };
}
