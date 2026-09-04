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
 * Attaches `Authorization: Bearer <accessToken>` to every request (except the login/refresh
 * endpoints themselves, which either need no token or authenticate via the refresh token in the
 * body, never a header) and transparently retries a request once after a successful refresh when
 * the server responds 401.
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
