import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthRefreshCoordinator } from './auth-refresh-coordinator.service';
import { UMS_AUTH_CONFIG } from './auth.config';
import { TokenStorageService } from './token-storage.service';

const AUTH_ENDPOINT_SUFFIXES = [
  '/api/v1/identity/auth/login',
  '/api/v1/identity/auth/refresh',
] as const;

/**
 * Attaches `Authorization: Bearer <accessToken>` to every request **to this app's own configured
 * API origin** (except the login/refresh endpoints themselves, which either need no token or
 * authenticate via the refresh token in the body, never a header) and transparently retries a
 * request once after a successful refresh when the server responds 401.
 *
 * **Never attaches the token to a request targeting a different origin** -- e.g. a pre-signed
 * direct-to-object-storage upload URL (S3/MinIO), or any other third-party host a consuming app's
 * HTTP client happens to be used for. Without this check, this app's own session bearer token
 * would leak to whatever external host a request's absolute URL names, since a naive
 * "not one of the two auth-endpoint suffixes" check says nothing about the request's origin at
 * all. A relative URL (no scheme/host) is always treated as same-origin as `config.baseUrl`,
 * since the underlying `HttpClient`/browser resolves it against the app's own origin, not a
 * third party's.
 *
 * Refresh-rotation semantics matter here (IDN-6): a 401 on the refresh call itself means the
 * refresh token was expired, already rotated, or reused-and-revoked (edge-cases.md's reuse-
 * detection path) -- that is not retried again, it propagates as a failure so the app can send
 * the user back to login. A 401 on any *other* request triggers exactly one
 * {@link AuthRefreshCoordinator.refresh} (single-flighted across concurrent callers) and one
 * retry of the original request with the rotated access token; a second 401 after that retry is
 * never itself treated as "refresh again" -- it propagates, since the session is either genuinely
 * unauthorized for that resource (403-shaped, not a token problem) or something is wrong the
 * caller needs to see rather than an interceptor silently looping.
 *
 * Register in `provideHttpClient(withInterceptors([correlationIdInterceptor, localeInterceptor,
 * authInterceptor]))` -- see this package's README "Wiring it up".
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const coordinator = inject(AuthRefreshCoordinator);
  const config = inject(UMS_AUTH_CONFIG);

  if (!isOwnApiUrl(req.url, config.baseUrl)) {
    return next(req);
  }

  const isAuthEndpoint = isAuthEndpointUrl(req.url, config.baseUrl);
  const authorizedReq = attachBearerToken(req, tokenStorage, isAuthEndpoint);

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }

      return coordinator
        .refresh()
        .pipe(
          switchMap((pair) =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${pair.accessToken}` } })),
          ),
        );
    }),
  );
};

function attachBearerToken(
  req: HttpRequest<unknown>,
  tokenStorage: TokenStorageService,
  isAuthEndpoint: boolean,
): HttpRequest<unknown> {
  if (isAuthEndpoint || req.headers.has('Authorization')) {
    return req;
  }

  const accessToken = tokenStorage.getAccessToken();
  if (!accessToken) {
    return req;
  }

  return req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } });
}

function isAuthEndpointUrl(url: string, baseUrl: string): boolean {
  return AUTH_ENDPOINT_SUFFIXES.some(
    (suffix) => url === `${baseUrl}${suffix}` || url.endsWith(suffix),
  );
}

/**
 * True for a relative URL (resolved by the browser/HttpClient against this app's own origin) or
 * an absolute URL whose origin matches `baseUrl` exactly -- false for any other absolute URL,
 * e.g. a pre-signed third-party upload URL. Deliberately conservative: an absolute URL is only
 * ever considered "ours" on an exact origin match, never a prefix/substring check, which could be
 * fooled by a similarly-named but different host.
 */
function isOwnApiUrl(url: string, baseUrl: string): boolean {
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    return true;
  }

  try {
    return new URL(url).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}
