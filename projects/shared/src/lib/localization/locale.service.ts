import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { UMS_DEFAULT_LOCALE, UMS_SUPPORTED_LOCALES, type UmsLocale } from './locale.types';

const LOCALE_STORAGE_KEY = 'ums-shared:locale';

/**
 * The active locale, consumed by {@link localeInterceptor} on every outgoing API call. This
 * service owns no translation strings or UI text itself (`ums-shared`'s own charter: generic
 * cross-cutting plumbing, never domain/UI content) -- a consuming app wires its own Angular i18n
 * setup (ADR-0011: "UI strings, validation messages, and static template chrome are handled by
 * standard Angular i18n, not database rows") and calls {@link setLocale} when the user changes
 * language, e.g. from a profile preference fetched via Identity at bootstrap.
 *
 * English is the platform-wide fallback (ADR-0011, ums-conventions.md "Localization
 * Implementation": "resolved server-side ... with English as the universal fallback") -- every
 * `{table}_translations`-backed read ums-core serves already falls back to English server-side
 * when a Bengali row is missing, so this service never needs its own fallback-resolution logic;
 * it only needs to tell the server which language the caller wants.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly document = inject(DOCUMENT);

  readonly locale = signal<UmsLocale>(this.readPersisted());

  setLocale(locale: UmsLocale): void {
    this.locale.set(locale);
    this.writePersisted(locale);
  }

  private readPersisted(): UmsLocale {
    try {
      const stored = this.document.defaultView?.localStorage?.getItem(LOCALE_STORAGE_KEY);
      if (stored && (UMS_SUPPORTED_LOCALES as string[]).includes(stored)) {
        return stored as UmsLocale;
      }
    } catch {
      // localStorage can throw (private-browsing quota, disabled storage) -- fall back silently,
      // matching @ums/design-system's ThemeService.
    }
    return UMS_DEFAULT_LOCALE;
  }

  private writePersisted(locale: UmsLocale): void {
    try {
      this.document.defaultView?.localStorage?.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Best-effort only.
    }
  }
}
