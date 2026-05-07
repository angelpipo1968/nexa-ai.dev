import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from '@/i18n/config';
import { DEFAULT_LOCALE, LANGUAGES } from '@/i18n/config';

// Importar todas las traducciones
import es from '@/i18n/locales/es.json';
import en from '@/i18n/locales/en.json';
import pt from '@/i18n/locales/pt.json';

const translations: Record<string, any> = { es, en, pt };

interface LocaleState {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

export const useLocaleStore = create<LocaleState>()(
    persist(
        (set, get) => ({
            locale: DEFAULT_LOCALE,

            setLocale: (locale: Locale) => {
                set({ locale });
                // Actualizar atributo lang del HTML
                if (typeof document !== 'undefined') {
                    document.documentElement.lang = locale;
                    document.documentElement.dir = LANGUAGES[locale]?.dir || 'ltr';
                }
            },

            t: (key: string, params?: Record<string, string | number>): string => {
                const { locale } = get();
                const messages = translations[locale] || translations[DEFAULT_LOCALE] || {};

                // Navegar por el path: "chat.welcomeTitle" → messages.chat.welcomeTitle
                const keys = key.split('.');
                let value: any = messages;

                for (const k of keys) {
                    if (value && typeof value === 'object' && k in value) {
                        value = value[k];
                    } else {
                        // Fallback a español (DEFAULT_LOCALE)
                        let fallback: any = translations[DEFAULT_LOCALE];
                        for (const fk of keys) {
                            if (fallback && typeof fallback === 'object' && fk in fallback) {
                                fallback = fallback[fk];
                            } else {
                                return key; // Devolver la key si no hay traducción
                            }
                        }
                        return typeof fallback === 'string' ? fallback : key;
                    }
                }

                if (typeof value !== 'string') return key;

                // Reemplazar parámetros: "Página {page} de {total}" → "Página 1 de 5"
                if (params) {
                    return Object.entries(params).reduce(
                        (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
                        value
                    );
                }

                return value;
            },
        }),
        {
            name: 'nexa-locale',
            partialize: (state) => ({ locale: state.locale }),
        }
    )
);
