import { decodeJwtPayload, type UmsAccessTokenClaims } from './jwt.util';

/** Builds an unsigned `header.payload.signature`-shaped token -- signature content is irrelevant, this package never verifies it. */
function fakeJwt(payload: Record<string, unknown>): string {
  const base64Url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(payload)}.fake-signature`;
}

/** Strict-mode-friendly assertion helper -- avoids `!` non-null assertions in the tests below. */
function expectDecoded(token: string): UmsAccessTokenClaims {
  const claims = decodeJwtPayload(token);
  if (claims === null) {
    throw new Error('Expected decodeJwtPayload to return claims, got null.');
  }
  return claims;
}

describe('decodeJwtPayload', () => {
  it('decodes sub/sid and a single-role claim into an array', () => {
    const token = fakeJwt({ sub: 'user-1', sid: 'session-1', roles: 'Admin', jti: 'jti-1' });

    const claims = expectDecoded(token);

    expect(claims.sub).toBe('user-1');
    expect(claims.sid).toBe('session-1');
    expect(claims.roles).toEqual(['Admin']);
    expect(claims.jti).toBe('jti-1');
  });

  it('decodes a multi-role claim (JwtTokenService adds one Claim per role name)', () => {
    const token = fakeJwt({ sub: 'user-1', sid: 'session-1', roles: ['Admin', 'Registrar'] });

    expect(expectDecoded(token).roles).toEqual(['Admin', 'Registrar']);
  });

  it('defaults roles to an empty array when the claim is absent', () => {
    const token = fakeJwt({ sub: 'user-1', sid: 'session-1' });

    expect(expectDecoded(token).roles).toEqual([]);
  });

  it('returns null for a malformed token', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('only.two-parts')).toBeNull();
  });

  it('returns null for a payload that is not valid base64url JSON', () => {
    expect(decodeJwtPayload('header.!!!not-base64!!!.sig')).toBeNull();
  });
});
