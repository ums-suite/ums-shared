import { TestBed } from '@angular/core/testing';
import type { UmsTokenPair } from './auth.types';
import { TokenStorageService } from './token-storage.service';

const samplePair: UmsTokenPair = {
  accessToken: 'access-token-1',
  accessTokenExpiresAt: '2026-01-01T00:15:00Z',
  refreshToken: 'refresh-token-1',
  refreshTokenExpiresAt: '2026-01-08T00:00:00Z',
  sessionId: 'session-1',
};

describe('TokenStorageService', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenStorageService);
  });

  afterEach(() => localStorage.clear());

  it('starts with no session', () => {
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.sessionId()).toBeNull();
  });

  it('setTokens stores the full pair and flips isAuthenticated', () => {
    service.setTokens(samplePair);

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.getAccessToken()).toBe('access-token-1');
    expect(service.getRefreshToken()).toBe('refresh-token-1');
    expect(service.sessionId()).toBe('session-1');
    expect(service.getAccessTokenExpiresAt()).toEqual(new Date('2026-01-01T00:15:00Z'));
  });

  it('clear() wipes the session', () => {
    service.setTokens(samplePair);
    service.clear();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getAccessToken()).toBeNull();
  });

  it('persists tokens across instances (survives a reload)', () => {
    service.setTokens(samplePair);
    const fresh = TestBed.runInInjectionContext(() => new TokenStorageService());
    expect(fresh.getAccessToken()).toBe('access-token-1');
    expect(fresh.sessionId()).toBe('session-1');
  });

  it('clear() removes the persisted copy too', () => {
    service.setTokens(samplePair);
    service.clear();
    const fresh = TestBed.runInInjectionContext(() => new TokenStorageService());
    expect(fresh.isAuthenticated()).toBeFalse();
  });

  it('ignores a malformed persisted value instead of throwing', () => {
    localStorage.setItem('ums-shared:tokens', '{not-json');
    const fresh = TestBed.runInInjectionContext(() => new TokenStorageService());
    expect(fresh.isAuthenticated()).toBeFalse();
  });

  it('notifySessionExpired() emits on sessionExpired$', () => {
    let emitted = false;
    service.sessionExpired$.subscribe(() => (emitted = true));

    service.notifySessionExpired();

    expect(emitted).toBeTrue();
  });
});
