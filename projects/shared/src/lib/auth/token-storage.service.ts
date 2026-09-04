import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { StoredTokens, UmsTokenPair } from './auth.types';

const STORAGE_KEY = 'ums-shared:tokens';

/**
 * Owns the current session's access/refresh token pair (IDN-5/IDN-6, requirement-spec.md
 * identity §2/§4). In-memory as the source of truth (a `signal`, read synchronously by
 * {@link authInterceptor} on every request with no async round trip), persisted best-effort to
 * `localStorage` so a page reload doesn't force a fresh login -- same try/catch-and-fall-back-
 * silently pattern as `@ums/design-system`'s `ThemeService` (private-browsing storage can throw
 * or silently no-op).
 *
 * This service never talks to the network itself -- issuing/rotating/revoking tokens is
 * {@link authInterceptor}'s and the generated Identity API client's job. It only stores what it's
 * given and tells callers whether a (possibly stale) token pair is present.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly document = inject(DOCUMENT);

  private readonly tokens = signal<StoredTokens | null>(this.readPersisted());
  private readonly sessionExpiredSubject = new Subject<void>();

  /** True once a token pair has been set and not yet cleared -- does not check expiry. */
  readonly isAuthenticated = computed(() => this.tokens() !== null);

  /**
   * Fires when {@link AuthRefreshCoordinator} clears the session because a refresh genuinely
   * failed (expired/reused/revoked refresh token) -- as opposed to a deliberate `clear()` call
   * from the app's own logout flow, which the app already knows about and doesn't need an event
   * for. Subscribe to redirect to login without polling `isAuthenticated`.
   */
  readonly sessionExpired$ = this.sessionExpiredSubject.asObservable();

  readonly sessionId = computed(() => this.tokens()?.sessionId ?? null);

  getAccessToken(): string | null {
    return this.tokens()?.accessToken ?? null;
  }

  getRefreshToken(): string | null {
    return this.tokens()?.refreshToken ?? null;
  }

  getAccessTokenExpiresAt(): Date | null {
    const value = this.tokens()?.accessTokenExpiresAt;
    return value ? new Date(value) : null;
  }

  setTokens(pair: UmsTokenPair): void {
    this.tokens.set(pair);
    this.writePersisted(pair);
  }

  /** Called on logout, on a refresh failure (expired/reused/revoked refresh token), or both. */
  clear(): void {
    this.tokens.set(null);
    try {
      this.document.defaultView?.localStorage?.removeItem(STORAGE_KEY);
    } catch {
      // Best-effort only.
    }
  }

  /** See {@link sessionExpired$}. Called by {@link AuthRefreshCoordinator}, not app code. */
  notifySessionExpired(): void {
    this.sessionExpiredSubject.next();
  }

  private readPersisted(): StoredTokens | null {
    try {
      const raw = this.document.defaultView?.localStorage?.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<StoredTokens>;
      if (
        typeof parsed.accessToken === 'string' &&
        typeof parsed.refreshToken === 'string' &&
        typeof parsed.sessionId === 'string' &&
        typeof parsed.accessTokenExpiresAt === 'string' &&
        typeof parsed.refreshTokenExpiresAt === 'string'
      ) {
        return parsed as StoredTokens;
      }
      return null;
    } catch {
      // Malformed JSON or storage unavailable -- treat as "no session" rather than throw.
      return null;
    }
  }

  private writePersisted(tokens: StoredTokens): void {
    try {
      this.document.defaultView?.localStorage?.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch {
      // Best-effort only -- the in-memory signal remains the source of truth for this tab.
    }
  }
}
