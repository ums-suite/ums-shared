import { Injectable, computed, inject } from '@angular/core';
import { TokenStorageService } from '../auth/token-storage.service';
import { decodeJwtPayload } from './jwt.util';

/**
 * Derives the caller's identity (`sub`, `sid`, `roles`) from the current access token, live --
 * every read goes through {@link TokenStorageService}'s `signal`, so this recomputes on every
 * login/refresh/logout without the app manually re-decoding a token anywhere.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly claims = computed(() => {
    const token = this.tokenStorage.getAccessToken();
    return token ? decodeJwtPayload(token) : null;
  });

  readonly userId = computed(() => this.claims()?.sub ?? null);
  readonly sessionId = computed(() => this.claims()?.sid ?? null);
  readonly roles = computed<readonly string[]>(() => this.claims()?.roles ?? []);

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  hasAnyRole(roles: readonly string[]): boolean {
    const mine = this.roles();
    return roles.some((role) => mine.includes(role));
  }
}
