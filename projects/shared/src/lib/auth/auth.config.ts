import { InjectionToken } from '@angular/core';

export interface UmsAuthConfig {
  /**
   * The origin ums-core's Host is served from, e.g. `https://api.ums-suite.example` or
   * `http://localhost:8080` in local dev -- must match whatever base URL the consuming app
   * configures the generated API client's `Configuration`/`BASE_PATH` with, since
   * {@link AuthRefreshCoordinator} calls `POST {baseUrl}/api/v1/identity/auth/refresh` directly
   * (not through the generated client, to keep this module independent of `api/generated`).
   */
  readonly baseUrl: string;
}

export const UMS_AUTH_CONFIG = new InjectionToken<UmsAuthConfig>('UMS_AUTH_CONFIG');
