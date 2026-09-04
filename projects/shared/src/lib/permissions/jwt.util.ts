/**
 * The claims carried on the JWT ums-core's Identity module issues, matching
 * `UMS.Shared.Authorization.UmsClaimTypes` exactly -- `sub` (user id), `sid` (session id), and
 * `roles` (zero or more Role names; a single-role token JSON-encodes `roles` as a string, a
 * multi-role token as a string array, since that's how `System.IdentityModel.Tokens.Jwt` emits a
 * JWT claim that was added more than once via `JwtTokenService.IssueAccessToken`).
 *
 * There is currently no `permissions` claim -- Identity's token only carries Role *names*, not
 * the resolved Permission set (see this package's README "Known gap: permission resolution").
 */
export interface UmsAccessTokenClaims {
  readonly sub: string;
  readonly sid: string;
  readonly roles: readonly string[];
  readonly jti?: string;
  readonly exp?: number;
  readonly nbf?: number;
  readonly iss?: string;
  readonly aud?: string;
  readonly [claim: string]: unknown;
}

/**
 * Decodes a JWT's payload without verifying its signature -- this package never verifies a token
 * (that's ums-core's job on every request; the client only needs to *read* claims already handed
 * to it over TLS by a server it just authenticated against). Returns `null` for anything that
 * isn't a well-formed `header.payload.signature` JWT with a JSON object payload, rather than
 * throwing -- callers (e.g. {@link CurrentUserService}) treat a `null` decode the same as "no
 * session".
 */
export function decodeJwtPayload(token: string): UmsAccessTokenClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const json = base64UrlDecode(parts[1]);
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const claims = parsed as Record<string, unknown>;
    return {
      ...claims,
      sub: typeof claims['sub'] === 'string' ? (claims['sub'] as string) : '',
      sid: typeof claims['sid'] === 'string' ? (claims['sid'] as string) : '',
      roles: normalizeRoles(claims['roles']),
    } as UmsAccessTokenClaims;
  } catch {
    return null;
  }
}

function normalizeRoles(raw: unknown): readonly string[] {
  if (typeof raw === 'string') {
    return [raw];
  }
  if (Array.isArray(raw)) {
    return raw.filter((role): role is string => typeof role === 'string');
  }
  return [];
}

/**
 * `atob` is available in every environment this library actually ships to -- a browser running
 * an Angular app (this package's whole reason for existing) and the ChromeHeadless-based Karma
 * runner its own tests run under. No Node `Buffer` fallback is needed (or wanted -- this is a
 * browser library; it should not silently grow a Node runtime dependency).
 */
function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}
