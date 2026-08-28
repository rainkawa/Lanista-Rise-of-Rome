export type Locale = 'en' | 'tr';

type TranslationValue = string | Record<string, unknown>;

const translations: Record<Locale, Record<string, TranslationValue>> = {
  en: {
    common: {
      gameOver: 'GAME OVER',
      titleScreen: 'Title Screen',
      newGame: 'New Game',
      loading: 'Loading...',
    },
    settings: {
      language: 'Language',
      turkish: 'Türkçe',
      english: 'English',
    },
    nav: {
      dashboard: 'Dashboard',
      home: 'Home',
      ludus: 'Ludus',
      gladiators: 'Gladiators',
      roster: 'Roster',
      staff: 'Staff',
      market: 'Market',
      arena: 'Arena',
      fame: 'Fame',
      politics: 'Politics',
      quests: 'Quests',
      statistics: 'Statistics',
      codex: 'Codex',
      settings: 'Settings',
      openMenu: 'Open menu',
      navigation: 'Main navigation',
      expandSidebar: 'Expand sidebar',
      collapseSidebar: 'Collapse sidebar',
    },
    resources: {
      treasury: 'Treasury',
      ludusFame: 'Ludus Fame',
    },
  },

  tr: {
    common: {
      gameOver: 'OYUN BİTTİ',
      titleScreen: 'Ana Menü',
      newGame: 'Yeni Oyun',
      loading: 'Yükleniyor...',
    },
    settings: {
      language: 'Dil',
      turkish: 'Türkçe',
      english: 'English',
    },
    nav: {
      dashboard: 'Merkez',
      home: 'Ana Sayfa',
      ludus: 'Ludus',
      gladiators: 'Gladyatörler',
      roster: 'Kadrolar',
      staff: 'Personel',
      market: 'Pazar',
      arena: 'Arena',
      fame: 'Şöhret',
      politics: 'Siyaset',
      quests: 'Görevler',
      statistics: 'İstatistikler',
      codex: 'Kodeks',
      settings: 'Ayarlar',
      openMenu: 'Menüyü aç',
      navigation: 'Ana navigasyon',
      expandSidebar: 'Menüyü genişlet',
      collapseSidebar: 'Menüyü daralt',
    },
    resources: {
      treasury: 'Hazine',
      ludusFame: 'Ludus Şöhreti',
    },
  },
};

const STORAGE_KEY = 'lanista-locale';

export function getLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'tr';
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);

  return saved === 'en' || saved === 'tr'
    ? saved
    : 'tr';
}

export function setLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, locale);
    window.dispatchEvent(new CustomEvent('lanista-locale-change'));
  }
}

function resolveKey(
  source: Record<string, TranslationValue>,
  parts: string[]
): string | undefined {
  let current: unknown = source;

  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'string'
    ? current
    : undefined;
}

export function t(
  key: string,
  locale: Locale = getLocale()
): string {
  const parts = key.split('.');

  return (
    resolveKey(translations[locale], parts) ??
    resolveKey(translations.en, parts) ??
    key
  );
}

export function getSupportedLocales(): Array<{
  id: Locale;
  label: string;
}> {
  return [
    {
      id: 'tr',
      label: t('settings.turkish', 'tr'),
    },
    {
      id: 'en',
      label: t('settings.english', 'en'),
    },
  ];
}
