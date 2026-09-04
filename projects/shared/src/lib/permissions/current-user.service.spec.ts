import { TestBed } from '@angular/core/testing';
import type { UmsTokenPair } from '../auth/auth.types';
import { TokenStorageService } from '../auth/token-storage.service';
import { CurrentUserService } from './current-user.service';

function fakeJwt(payload: Record<string, unknown>): string {
  const base64Url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(payload)}.fake-signature`;
}

function tokenPairWithClaims(claims: Record<string, unknown>): UmsTokenPair {
  return {
    accessToken: fakeJwt(claims),
    accessTokenExpiresAt: '2026-01-01T00:15:00Z',
    refreshToken: 'refresh-token',
    refreshTokenExpiresAt: '2026-01-08T00:00:00Z',
    sessionId: (claims['sid'] as string) ?? 'session-1',
  };
}

describe('CurrentUserService', () => {
  let service: CurrentUserService;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrentUserService);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => localStorage.clear());

  it('has no identity before a session exists', () => {
    expect(service.userId()).toBeNull();
    expect(service.sessionId()).toBeNull();
    expect(service.roles()).toEqual([]);
  });

  it('derives sub/sid/roles from the current access token', () => {
    tokenStorage.setTokens(
      tokenPairWithClaims({ sub: 'user-42', sid: 'session-42', roles: ['Admin', 'Registrar'] }),
    );

    expect(service.userId()).toBe('user-42');
    expect(service.sessionId()).toBe('session-42');
    expect(service.roles()).toEqual(['Admin', 'Registrar']);
  });

  it('hasRole/hasAnyRole check membership in the roles claim', () => {
    tokenStorage.setTokens(tokenPairWithClaims({ sub: 'u1', sid: 's1', roles: ['Registrar'] }));

    expect(service.hasRole('Registrar')).toBeTrue();
    expect(service.hasRole('Admin')).toBeFalse();
    expect(service.hasAnyRole(['Admin', 'Registrar'])).toBeTrue();
    expect(service.hasAnyRole(['Admin', 'Faculty'])).toBeFalse();
  });

  it('clears identity when the session is cleared', () => {
    tokenStorage.setTokens(tokenPairWithClaims({ sub: 'u1', sid: 's1', roles: ['Admin'] }));
    tokenStorage.clear();

    expect(service.userId()).toBeNull();
    expect(service.roles()).toEqual([]);
  });
});
