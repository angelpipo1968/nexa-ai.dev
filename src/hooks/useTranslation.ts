import { useLocaleStore } from '@/store/useLocaleStore';

export function useTranslation() {
    const { t, locale, setLocale } = useLocaleStore();

    return { t, locale, setLocale };
}
