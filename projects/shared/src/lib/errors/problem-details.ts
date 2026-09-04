/**
 * The wire shape of every error response across all UMS.Host modules
 * (ums-conventions.md "Error Handling & Response Consistency": one shared
 * `UMS.Shared.ErrorHandling` library wires a `ProblemDetails`-based envelope --
 * `code`/`message`/`correlationId` -- for both the global exception handler and every
 * Result-pattern domain/business error, so this shape never varies module to module).
 *
 * The server writes RFC 7807 `ProblemDetails` with `title` carrying the human-readable message
 * and `code`/`correlationId` as extension members (see `UMS.Shared.ErrorHandling.ResultEndpointExtensions`
 * and `GlobalExceptionHandler` in ums-core) -- `message` below is this package's own normalized
 * alias for `title`, not a field the server literally writes.
 */
export interface UmsProblemDetails {
  /** RFC 7807 problem type URI, e.g. "https://ums-suite.internal/errors/notfound". */
  readonly type?: string;
  /** The HTTP status code, duplicated from the response status for convenience. */
  readonly status?: number;
  /** Human-readable error message (server's `title` field). */
  readonly message: string;
  /** Stable, machine-readable error code for client-side branching, e.g. "USER_NOT_FOUND". */
  readonly code?: string;
  /** Request correlation id -- also present as the `X-Correlation-Id` response header. */
  readonly correlationId?: string;
  /** Any other server-added ProblemDetails extension member, preserved as-is. */
  readonly [extension: string]: unknown;
}

/**
 * A normalized, always-present error shape this package's HTTP layer surfaces to consumers --
 * every generated API service call that fails resolves its error to this shape (see
 * `toUmsApiError`) instead of leaving a raw `HttpErrorResponse` for every consumer to re-parse
 * the ProblemDetails envelope out of by hand.
 */
export interface UmsApiError {
  /** HTTP status code, or 0 for a client-side/network error (no response was ever received). */
  readonly status: number;
  /** Best-effort human-readable message -- server's `title`, or a generic fallback. */
  readonly message: string;
  /** The server's stable error code, when the response carried one. */
  readonly code?: string;
  /** The server's correlation id, when the response carried one. */
  readonly correlationId?: string;
  /** The full parsed ProblemDetails body, when the response body was valid JSON. */
  readonly problemDetails?: UmsProblemDetails;
}
