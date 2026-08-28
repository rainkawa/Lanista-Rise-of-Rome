import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '@app/hooks';
import { setScreen, getMonthName } from '@features/game/gameSlice';
import type { GameScreen } from '@/types';
import { clsx } from 'clsx';
import { Tooltip } from '@components/ui';

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
  const ludusName = playerState?.ludusName || 'Lanista Ludus';
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems: { id: GameScreen; label: string; icon: string; shortLabel?: string }[] = [
    { id: 'dashboard', label: 'Genel Bakış', icon: '🏛️', shortLabel: 'Ana Sayfa' },
    { id: 'ludus', label: 'Ludus', icon: '🏗️' },
    { id: 'gladiators', label: 'Gladyatörler', icon: '⚔️', shortLabel: 'Kadro' },
    { id: 'staff', label: 'Personel', icon: '👥' },
    { id: 'marketplace', label: 'Pazar', icon: '🛒' },
    { id: 'arena', label: 'Arena', icon: '🏟️' },
    { id: 'fame', label: 'Şöhret', icon: '⭐' },
    { id: 'politics', label: 'Siyaset', icon: '🏛️' },
    { id: 'quests', label: 'Görevler', icon: '📜' },
    { id: 'statistics', label: 'İstatistikler', icon: '📊' },
    { id: 'codex', label: 'Codex', icon: '📖' },
  ];

  const handleNavigate = (screen: GameScreen) => {
    dispatch(setScreen(screen));
    setMobileMenuOpen(false);
  };

  const getPhaseIcon = () => {
    switch (currentPhase) {
      case 'dawn': return '🌅';
      case 'morning': return '☀️';
      case 'afternoon': return '🌤️';
      case 'evening': return '🌆';
      case 'night': return '🌙';
      default: return '☀️';
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
          >
            <span className="text-2xl">{mobileMenuOpen ? '✕' : '☰'}</span>
          </button>

          {/* Ludus Name */}
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="font-roman text-lg sm:text-2xl text-roman-gold-500 text-shadow-roman truncate max-w-[120px] sm:max-w-none">
              {ludusName}
            </h1>
            <div className="hidden sm:flex items-center gap-2 text-roman-marble-400 text-sm">
              <span>{getPhaseIcon()}</span>
              <span>{monthName}, {currentYear} MS</span>
            </div>
          </div>

          {/* Resources */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Date (mobile only) */}
            <div className="flex sm:hidden items-center gap-1 text-roman-marble-400 text-xs">
              <span>{getPhaseIcon()}</span>
              <span>{monthName.substring(0, 3)} {currentYear}</span>
            </div>

            {/* Gold */}
            <Tooltip content="Hazine">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-base sm:text-xl">🪙</span>
                <span className="font-roman text-roman-gold-400 text-sm sm:text-lg">{gold.toLocaleString()}</span>
              </div>
            </Tooltip>

            {/* Fame */}
            <Tooltip content="Ludus Şöhreti">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-base sm:text-xl">⭐</span>
                <span className="font-roman text-roman-marble-300 text-sm sm:text-lg">{ludusFame}</span>
              </div>
            </Tooltip>

            {/* Settings */}
            <button
              onClick={() => handleNavigate('settings')}
              className="hidden sm:block text-roman-marble-400 hover:text-roman-gold-500 transition-colors text-xl"
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
                        <span className="font-roman text-sm uppercase tracking-wide">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.nav>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Side Navigation */}
        <nav className={clsx(
          'hidden lg:block bg-roman-marble-900 border-r border-roman-marble-700 py-4 transition-all duration-300 flex-shrink-0',
          sidebarCollapsed ? 'w-16' : 'w-48'
        )}>
          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full px-4 py-2 text-roman-marble-500 hover:text-roman-marble-300 transition-colors text-right"
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>

          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.id}>
                {sidebarCollapsed ? (
                  <Tooltip content={item.label} position="right">
                    <button
                      onClick={() => handleNavigate(item.id)}
                      className={clsx(
                        'w-full px-4 py-3 flex items-center justify-center transition-all',
                        'hover:bg-roman-marble-800',
                        currentScreen === item.id
                          ? 'bg-roman-marble-800 border-l-2 border-roman-gold-500 text-roman-gold-400'
                          : 'text-roman-marble-300 border-l-2 border-transparent'
                      )}
                    >
                      <span className="text-xl">{item.icon}</span>
                    </button>
                  </Tooltip>
                ) : (
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={clsx(
                      'w-full px-4 py-3 flex items-center gap-3 text-left transition-all',
                      'hover:bg-roman-marble-800 hover:border-l-2 hover:border-roman-gold-500',
                      currentScreen === item.id
                        ? 'bg-roman-marble-800 border-l-2 border-roman-gold-500 text-roman-gold-400'
                        : 'text-roman-marble-300 border-l-2 border-transparent'
                    )}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-roman text-sm uppercase tracking-wide">{item.label}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-roman-marble-900 border-t-2 border-roman-gold-700 z-30">
        <div className="flex justify-around items-center py-2">
          {navItems.slice(0, 5).map(item => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={clsx(
                'flex flex-col items-center p-2 transition-colors',
                currentScreen === item.id ? 'text-roman-gold-400' : 'text-roman-marble-400'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] mt-0.5 font-roman uppercase">
                {item.shortLabel || item.label}
              </span>
            </button>
          ))}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center p-2 text-roman-marble-400"
          >
            <span className="text-xl">•••</span>
            <span className="text-[10px] mt-0.5 font-roman uppercase">Daha Fazla</span>
          </button>
        </div>
      </nav>

      {/* Spacer for bottom navigation */}
      <div className="h-16 lg:hidden" />
    </div>
  );
};
