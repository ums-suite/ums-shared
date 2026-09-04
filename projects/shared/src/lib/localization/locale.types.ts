/**
 * The two languages required across the platform end-to-end
 * (`ums-requirements.md` §4.1, ADR-0011). English is the universal server-side fallback for any
 * entity missing a translation row -- see {@link LocaleService}'s own docs.
 */
export type UmsLocale = 'en' | 'bn';

export const UMS_DEFAULT_LOCALE: UmsLocale = 'en';
export const UMS_SUPPORTED_LOCALES: readonly UmsLocale[] = ['en', 'bn'];
