import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '@app/hooks';
import { setScreen, getMonthName } from '@features/game/gameSlice';
import type { GameScreen } from '@/types';
import { clsx } from 'clsx';
import { Tooltip } from '@components/ui';
import { t, getLocale } from '@/i18n';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector(state => state.game);

  const currentYear = gameState?.currentYear || 73;
  const currentMonth = gameState?.currentMonth || 1;
  const currentScreen = gameState?.currentScreen || 'dashboard';
  const currentPhase = gameState?.currentPhase || 'morning';

  const monthName = getMonthName(currentMonth);

  const playerState = useAppSelector(state => state.player);
  const fameState = useAppSelector(state => state.fame);

  const gold = playerState?.gold || 0;
  const ludusFame = fameState?.ludusFame || 0;
  const ludusName = playerState?.ludusName || 'Ludus Magnus';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const handleLocaleChange = () => {
      setLocaleState(getLocale());
    };

    window.addEventListener('lanista-locale-change', handleLocaleChange);

    return () => {
      window.removeEventListener('lanista-locale-change', handleLocaleChange);
    };
  }, []);

  const navItems: {
    id: GameScreen;
    label: string;
    icon: string;
    shortLabel?: string;
  }[] = [
    {
      id: 'dashboard',
      label: t('nav.dashboard', locale),
      icon: '🏛️',
      shortLabel: t('nav.home', locale),
    },
    {
      id: 'ludus',
      label: t('nav.ludus', locale),
      icon: '🏗️',
    },
    {
      id: 'gladiators',
      label: t('nav.gladiators', locale),
      icon: '⚔️',
      shortLabel: t('nav.roster', locale),
    },
    {
      id: 'staff',
      label: t('nav.staff', locale),
      icon: '👥',
    },
    {
      id: 'marketplace',
      label: t('nav.market', locale),
      icon: '🛒',
    },
    {
      id: 'arena',
      label: t('nav.arena', locale),
      icon: '🏟️',
    },
    {
      id: 'fame',
      label: t('nav.fame', locale),
      icon: '⭐',
    },
    {
      id: 'politics',
      label: t('nav.politics', locale),
      icon: '🏛️',
    },
    {
      id: 'quests',
      label: t('nav.quests', locale),
      icon: '📜',
    },
    {
      id: 'statistics',
      label: t('nav.statistics', locale),
      icon: '📊',
    },
    {
      id: 'codex',
      label: t('nav.codex', locale),
      icon: '📖',
    },
  ];

  const handleNavigate = (screen: GameScreen) => {
    dispatch(setScreen(screen));
    setMobileMenuOpen(false);
  };

  const getPhaseIcon = () => {
    switch (currentPhase) {
      case 'dawn':
        return '🌅';
      case 'morning':
        return '☀️';
      case 'afternoon':
        return '🌤️';
      case 'evening':
        return '🌆';
      case 'night':
        return '🌙';
      default:
        return '☀️';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-roman-marble-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-roman-marble-800 to-roman-marble-900 border-b-2 border-roman-gold-700 px-3 sm:px-4 py-2 sm:py-3">
        <div className="mx-auto flex items-center justify-between">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-roman-marble-300 hover:text-roman-gold-500 transition-colors p-2"
            aria-label={t('nav.openMenu', locale)}
          >
            <span className="text-2xl">
              {mobileMenuOpen ? '✕' : '☰'}
            </span>
          </button>

          {/* Ludus Name */}
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="font-roman text-lg sm:text-2xl text-roman-gold-500 text-shadow-roman truncate max-w-[120px] sm:max-w-none">
              {ludusName}
            </h1>

            <div className="hidden sm:flex items-center gap-2 text-roman-marble-400 text-sm">
              <span>{getPhaseIcon()}</span>
              <span>{monthName}, {currentYear} AD</span>
            </div>
          </div>

          {/* Resources */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Date (mobile only) */}
            <div className="flex sm:hidden items-center gap-1 text-roman-marble-400 text-xs">
              <span>{getPhaseIcon()}</span>
              <span>
                {monthName.substring(0, 3)} {currentYear}
              </span>
            </div>

            {/* Gold */}
            <Tooltip content={t('resources.treasury', locale)}>
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-base sm:text-xl">🪙</span>
                <span className="font-roman text-roman-gold-400 text-sm sm:text-lg">
                  {gold.toLocaleString()}
                </span>
              </div>
            </Tooltip>

            {/* Fame */}
            <Tooltip content={t('resources.ludusFame', locale)}>
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-base sm:text-xl">⭐</span>
                <span className="font-roman text-roman-marble-300 text-sm sm:text-lg">
                  {ludusFame}
                </span>
              </div>
            </Tooltip>

            {/* Settings */}
            <button
              onClick={() => handleNavigate('settings')}
              className="hidden sm:block text-roman-marble-400 hover:text-roman-gold-500 transition-colors text-xl"
              aria-label={t('nav.settings', locale)}
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Navigation Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              />

              <motion.nav
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.2 }}
                className="fixed left-0 top-0 h-full w-64 bg-roman-marble-900 border-r border-roman-marble-700 z-50 lg:hidden pt-16"
                aria-label={t('nav.navigation', locale)}
              >
                <ul className="space-y-1 p-2">
                  {navItems.map(item => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNavigate(item.id)}
                        className={clsx(
                          'w-full px-4 py-3 flex items-center gap-3 text-left transition-all rounded-lg',
                          'hover:bg-roman-marble-800',
                          currentScreen === item.id
                            ? 'bg-roman-marble-800 text-roman-gold-400'
                            : 'text-roman-marble-300'
                        )}
                      >
                        <span className="text-xl">{item.icon}</span>

                        <span className="font-roman text-sm uppercase tracking-wide">
                          {item.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.nav>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Side Navigation */}
        <nav
          className={clsx(
            'hidden lg:block bg-roman-marble-900 border-r border-roman-marble-700 py-4 transition-all duration-300 flex-shrink-0',
            sidebarCollapsed ? 'w-16' : 'w-48'
          )}
          aria-label={t('nav.navigation', locale)}
        >
          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full px-4 py-2 text-roman-marble-500 hover:text-roman-marble-300 transition-colors text-right"
            aria-label={
              sidebarCollapsed
                ? t('nav.expandSidebar', locale)
                : t('nav.collapseSidebar', locale)
            }
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>

          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.id}>
                {sidebarCollapsed ? (
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={clsx(
                      'w-full py-3 flex items-center justify-center transition-all rounded-lg',
                      'hover:bg-roman-marble-800',
                      currentScreen === item.id
                        ? 'bg-roman-marble-800 text-roman-gold-400'
                        : 'text-roman-marble-300'
                    )}
                    title={item.label}
                    aria-label={item.label}
                  >
                    <span className="text-xl">{item.icon}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={clsx(
                      'w-full px-4 py-3 flex items-center gap-3 text-left transition-all rounded-lg',
                      'hover:bg-roman-marble-800',
                      currentScreen === item.id
                        ? 'bg-roman-marble-800 text-roman-gold-400'
                        : 'text-roman-marble-300'
                    )}
                  >
                    <span className="text-xl">{item.icon}</span>

                    <span className="font-roman text-sm uppercase tracking-wide">
                      {item.label}
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
