import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { UmsTokenPair } from './auth.types';
import { authInterceptor } from './auth.interceptor';
import { UMS_AUTH_CONFIG } from './auth.config';
import { TokenStorageService } from './token-storage.service';

const initialPair: UmsTokenPair = {
  accessToken: 'access-1',
  accessTokenExpiresAt: '2026-01-01T00:15:00Z',
  refreshToken: 'refresh-1',
  refreshTokenExpiresAt: '2026-01-08T00:00:00Z',
  sessionId: 'session-1',
};

const rotatedPair: UmsTokenPair = {
  accessToken: 'access-2',
  accessTokenExpiresAt: '2026-01-01T00:30:00Z',
  refreshToken: 'refresh-2',
  refreshTokenExpiresAt: '2026-01-08T00:15:00Z',
  sessionId: 'session-1',
};

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: UMS_AUTH_CONFIG, useValue: { baseUrl: 'http://localhost:8080' } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('attaches Authorization: Bearer <accessToken> when a session exists', () => {
    tokenStorage.setTokens(initialPair);

    http.get('/api/v1/identity/sessions').subscribe();

    const req = httpMock.expectOne('/api/v1/identity/sessions');
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
    req.flush([]);
  });

  it('attaches no Authorization header when there is no session', () => {
    http.get('/api/v1/identity/sessions').subscribe();

    const req = httpMock.expectOne('/api/v1/identity/sessions');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('never attaches a Bearer token to the login endpoint', () => {
    http.post('http://localhost:8080/api/v1/identity/auth/login', {}).subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/v1/identity/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('on a 401, refreshes once and retries the original request with the rotated token', () => {
    tokenStorage.setTokens(initialPair);
    let result: unknown;

    http.get('/api/v1/identity/sessions').subscribe((r) => (result = r));

    const firstAttempt = httpMock.expectOne('/api/v1/identity/sessions');
    expect(firstAttempt.request.headers.get('Authorization')).toBe('Bearer access-1');
    firstAttempt.flush({ title: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    const refreshCall = httpMock.expectOne('http://localhost:8080/api/v1/identity/auth/refresh');
    expect(refreshCall.request.body).toEqual({ refreshToken: 'refresh-1' });
    refreshCall.flush(rotatedPair);

    const retry = httpMock.expectOne('/api/v1/identity/sessions');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush([{ id: 'session-1' }]);

    expect(result).toEqual([{ id: 'session-1' }]);
    expect(tokenStorage.getAccessToken()).toBe('access-2');
  });

  it('single-flights concurrent 401s into exactly one refresh call', () => {
    tokenStorage.setTokens(initialPair);
    let sessionsResult: unknown;
    let auditResult: unknown;

    http.get('/api/v1/identity/sessions').subscribe((r) => (sessionsResult = r));
    http.get('/api/v1/audit/entries').subscribe((r) => (auditResult = r));

    httpMock
      .expectOne('/api/v1/identity/sessions')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne('/api/v1/audit/entries')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    // expectOne itself throws if zero or more-than-one matching request is pending -- this is
    // the assertion that exactly one refresh call was made for both 401s, not two.
    const refreshCall = httpMock.expectOne('http://localhost:8080/api/v1/identity/auth/refresh');
    refreshCall.flush(rotatedPair);

    httpMock.expectOne('/api/v1/identity/sessions').flush(['session-list']);
    httpMock.expectOne('/api/v1/audit/entries').flush(['audit-list']);

    // Both original callers still got their own successful retry through the one shared refresh.
    expect(sessionsResult).toEqual(['session-list']);
    expect(auditResult).toEqual(['audit-list']);
    expect(tokenStorage.getAccessToken()).toBe('access-2');
  });

  it('propagates failure and clears the session when refresh itself is rejected (reuse/expiry)', () => {
    tokenStorage.setTokens(initialPair);
    let failed = false;

    http.get('/api/v1/identity/sessions').subscribe({ error: () => (failed = true) });

    httpMock
      .expectOne('/api/v1/identity/sessions')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    httpMock
      .expectOne('http://localhost:8080/api/v1/identity/auth/refresh')
      .flush({ title: 'invalid refresh token' }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBeTrue();
    expect(tokenStorage.isAuthenticated()).toBeFalse();
  });

  it('does not attempt a refresh loop when the refresh endpoint itself returns 401', () => {
    // Simulates a caller manually invoking refresh via the interceptor's own auth-endpoint path --
    // must fail straight through, never re-trigger another refresh.
    let errorStatus: number | undefined;
    http
      .post('http://localhost:8080/api/v1/identity/auth/refresh', { refreshToken: 'x' })
      .subscribe({
        error: (err: unknown) => {
          errorStatus = err instanceof HttpErrorResponse ? err.status : undefined;
        },
      });

    httpMock
      .expectOne('http://localhost:8080/api/v1/identity/auth/refresh')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    // The failure propagated straight to the caller (no retried refresh call left pending --
    // httpMock.verify() in afterEach would fail otherwise).
    expect(errorStatus).toBe(401);
  });
});
