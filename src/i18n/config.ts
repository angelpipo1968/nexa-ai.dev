export const LANGUAGES = {
    es: { name: 'Español', flag: '🇪🇸', dir: 'ltr' },
    en: { name: 'English', flag: '🇺🇸', dir: 'ltr' },
    pt: { name: 'Português', flag: '🇧🇷', dir: 'ltr' },
    fr: { name: 'Français', flag: '🇫🇷', dir: 'ltr' },
    de: { name: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
    ja: { name: '日本語', flag: '🇯🇵', dir: 'ltr' },
    zh: { name: '中文', flag: '🇨🇳', dir: 'ltr' },
    ar: { name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
    ko: { name: '한국어', flag: '🇰🇷', dir: 'ltr' },
    hi: { name: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
} as const;

export type Locale = keyof typeof LANGUAGES;
export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALES = Object.keys(LANGUAGES) as Locale[];
