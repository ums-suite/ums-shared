import { TestBed } from '@angular/core/testing';
import { LocaleService } from './locale.service';

describe('LocaleService', () => {
  let service: LocaleService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocaleService);
  });

  afterEach(() => localStorage.clear());

  it('defaults to English (the platform-wide fallback, ADR-0011)', () => {
    expect(service.locale()).toBe('en');
  });

  it('setLocale updates the signal', () => {
    service.setLocale('bn');
    expect(service.locale()).toBe('bn');
  });

  it('persists the locale across service instances', () => {
    service.setLocale('bn');
    const fresh = TestBed.runInInjectionContext(() => new LocaleService());
    expect(fresh.locale()).toBe('bn');
  });

  it('ignores a corrupted persisted value and falls back to English', () => {
    localStorage.setItem('ums-shared:locale', 'not-a-real-locale');
    const fresh = TestBed.runInInjectionContext(() => new LocaleService());
    expect(fresh.locale()).toBe('en');
  });
});
