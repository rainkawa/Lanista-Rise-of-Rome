export type Locale = 'en' | 'tr';

const translations: Record<Locale, Record<string, string>> = {
  en: {
    'common.gameOver': 'GAME OVER',
    'common.titleScreen': 'Title Screen',
    'common.newGame': 'New Game',
  },

  tr: {
    'common.gameOver': 'OYUN BİTTİ',
    'common.titleScreen': 'Ana Menü',
    'common.newGame': 'Yeni Oyun',
  },
};

const STORAGE_KEY = 'lanista-locale';

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'tr';

  const saved = window.localStorage.getItem(STORAGE_KEY);

  return saved === 'en' || saved === 'tr'
    ? saved
    : 'tr';
}

export function setLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }
}

export function t(
  key: string,
  locale: Locale = getLocale()
): string {
  return translations[locale][key]
    ?? translations.en[key]
    ?? key;
}
