import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, shareReplay, tap, throwError } from 'rxjs';
import { UMS_AUTH_CONFIG } from './auth.config';
import type { UmsTokenPair } from './auth.types';
import { TokenStorageService } from './token-storage.service';

/**
 * Single-flights token refresh (IDN-6, requirement-spec.md identity §4: "Refresh token rotation
 * is single-use"). Because rotation is single-use, two concurrent 401s must never each fire their
 * own `POST /auth/refresh` -- the second call would present an already-rotated token and ums-core
 * would reject it as reuse/compromise (`RefreshTests.Reusing_an_already_rotated_refresh_token_is_
 * rejected_as_compromise`), incorrectly revoking the whole Session. Every caller within the same
 * in-flight window instead shares the one real HTTP call via `shareReplay(1)`.
 *
 * On a genuine refresh failure (expired/reused/revoked refresh token -- ums-core returns 401),
 * the stored session is cleared and {@link TokenStorageService.notifySessionExpired} fires so a
 * consuming app can react (e.g. redirect to login) without polling `isAuthenticated`.
 */
@Injectable({ providedIn: 'root' })
export class AuthRefreshCoordinator {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly config = inject(UMS_AUTH_CONFIG);

  private inFlight: Observable<UmsTokenPair> | null = null;

  refresh(): Observable<UmsTokenPair> {
    if (this.inFlight) {
      return this.inFlight;
    }

    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('UMS_SHARED_NO_REFRESH_TOKEN: no session to refresh.'));
    }

    const request$ = this.http
      .post<UmsTokenPair>(`${this.config.baseUrl}/api/v1/identity/auth/refresh`, { refreshToken })
      .pipe(
        tap((pair) => this.tokenStorage.setTokens(pair)),
        catchError((error: unknown) => {
          this.tokenStorage.clear();
          this.tokenStorage.notifySessionExpired();
          return throwError(() => error);
        }),
        shareReplay(1),
        finalize(() => {
          this.inFlight = null;
        }),
      );

    this.inFlight = request$;
    return request$;
  }
}
