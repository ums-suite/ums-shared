/**
 * The exact wire shape of `UMS.Modules.Identity.Application.Auth.TokenPairResult` -- what
 * `POST /api/v1/identity/auth/login` and `POST /api/v1/identity/auth/refresh` both return.
 * Field names are camelCase over the wire (System.Text.Json default), matching this interface.
 */
export interface UmsTokenPair {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: string;
  readonly sessionId: string;
}

/** In-memory/persisted view of the current session's tokens -- {@link UmsTokenPair} plus nothing else. */
export type StoredTokens = UmsTokenPair;
