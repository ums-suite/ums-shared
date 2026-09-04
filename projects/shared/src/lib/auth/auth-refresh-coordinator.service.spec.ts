import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthRefreshCoordinator } from './auth-refresh-coordinator.service';
import { UMS_AUTH_CONFIG } from './auth.config';
import type { UmsTokenPair } from './auth.types';
import { TokenStorageService } from './token-storage.service';

const initialPair: UmsTokenPair = {
  accessToken: 'access-1',
  accessTokenExpiresAt: '2026-01-01T00:15:00Z',
  refreshToken: 'refresh-1',
  refreshTokenExpiresAt: '2026-01-08T00:00:00Z',
  sessionId: 'session-1',
};

describe('AuthRefreshCoordinator', () => {
  let coordinator: AuthRefreshCoordinator;
  let tokenStorage: TokenStorageService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UMS_AUTH_CONFIG, useValue: { baseUrl: 'http://localhost:8080' } },
      ],
    });
    TestBed.inject(HttpClient);
    coordinator = TestBed.inject(AuthRefreshCoordinator);
    tokenStorage = TestBed.inject(TokenStorageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('errors immediately, with no HTTP call, when there is no refresh token to use', () => {
    let errored = false;
    coordinator.refresh().subscribe({ error: () => (errored = true) });
    expect(errored).toBeTrue();
    httpMock.expectNone('http://localhost:8080/api/v1/identity/auth/refresh');
  });

  it('stores the rotated pair on success', () => {
    tokenStorage.setTokens(initialPair);

    coordinator.refresh().subscribe();
    httpMock
      .expectOne('http://localhost:8080/api/v1/identity/auth/refresh')
      .flush({ ...initialPair, accessToken: 'access-2', refreshToken: 'refresh-2' });

    expect(tokenStorage.getAccessToken()).toBe('access-2');
    expect(tokenStorage.getRefreshToken()).toBe('refresh-2');
  });

  it('clears the session and notifies sessionExpired$ on a rejected refresh', () => {
    tokenStorage.setTokens(initialPair);
    let expired = false;
    tokenStorage.sessionExpired$.subscribe(() => (expired = true));

    coordinator.refresh().subscribe({ error: () => undefined });
    httpMock
      .expectOne('http://localhost:8080/api/v1/identity/auth/refresh')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(tokenStorage.isAuthenticated()).toBeFalse();
    expect(expired).toBeTrue();
  });

  it('a fresh refresh() call after completion issues a new HTTP call (not stuck single-flighted forever)', () => {
    tokenStorage.setTokens(initialPair);

    coordinator.refresh().subscribe();
    httpMock
      .expectOne('http://localhost:8080/api/v1/identity/auth/refresh')
      .flush({ ...initialPair, accessToken: 'access-2', refreshToken: 'refresh-2' });

    coordinator.refresh().subscribe();
    httpMock
      .expectOne('http://localhost:8080/api/v1/identity/auth/refresh')
      .flush({ ...initialPair, accessToken: 'access-3', refreshToken: 'refresh-3' });

    expect(tokenStorage.getAccessToken()).toBe('access-3');
  });
});
