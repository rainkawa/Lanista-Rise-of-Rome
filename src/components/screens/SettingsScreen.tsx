import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '@app/hooks';
import { 
  setScreen, 
  setDifficulty, 
  toggleAutosave, 
  toggleSound, 
  toggleMusic,
  setSFXVolume,
  setMusicVolume,
} from '@features/game/gameSlice';
import { useAudio } from '@/audio/useAudio';
import { Card, CardHeader, CardTitle, CardContent, Button, Modal, Divider } from '@components/ui';
import type { Difficulty } from '@/types';
import { clsx } from 'clsx';

// Import version from package.json
const APP_VERSION = __APP_VERSION__;
const REPO_URL = 'https://github.com/todorivanov/ludus-magnus';

export const SettingsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector(state => state.game);
  const settings = gameState?.settings || {
    difficulty: 'normal',
    autosave: true,
    soundEnabled: true,
    musicEnabled: true,
    sfxVolume: 0.7,
    musicVolume: 0.4,
    tutorialCompleted: false,
  };
  const { playSFX } = useAudio();
  const currentScreen = gameState?.currentScreen || 'title';
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const difficulties: { value: Difficulty; label: string; description: string }[] = [
    { value: 'easy', label: 'Çırak', description: 'Daha fazla başlangıç altını, daha kolay rakipler' },
    { value: 'normal', label: 'Lanista', description: 'Dengeli deneyim' },
    { value: 'hard', label: 'Şampiyon', description: 'Daha az altın, daha zor rakipler' },
  ];

  const gameMode = gameState?.gameMode || 'lanista';

  const handleBack = () => {
    if (currentScreen === 'title') {
      dispatch(setScreen('title'));
    } else {
      dispatch(setScreen(gameMode === 'gladiator' ? 'gladiatorDashboard' : 'dashboard'));
    }
  };

  const handleReset = () => {
    setShowResetConfirm(false);
    
    // Clear all game-related localStorage keys
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.startsWith('persist:') || key.includes('ludus')
    );
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Also try the specific key
    localStorage.removeItem('persist:ludus-magnus-reborn');
    
    // Force reload to get fresh state
    window.location.href = window.location.origin + window.location.pathname;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-roman-marble-900 via-roman-marble-800 to-roman-marble-900 p-4 sm:p-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack}>
            ← Geri
          </Button>
          <h1 className="font-roman text-3xl text-roman-gold-500">Ayarlar</h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </motion.div>

        {/* Difficulty */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Zorluk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {difficulties.map((diff) => (
                  <button
                    key={diff.value}
                    onClick={() => dispatch(setDifficulty(diff.value))}
                    className={clsx(
                      'p-4 rounded-lg border-2 transition-all text-left',
                      settings.difficulty === diff.value
                        ? 'border-roman-gold-500 bg-roman-gold-600/10'
                        : 'border-roman-marble-700 bg-roman-marble-800 hover:border-roman-marble-600'
                    )}
                  >
                    <div className={clsx(
                      'font-roman text-lg mb-1',
                      settings.difficulty === diff.value ? 'text-roman-gold-400' : 'text-roman-marble-200'
                    )}>
                      {diff.label}
                    </div>
                    <div className="text-xs text-roman-marble-500">
                      {diff.description}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Game Settings */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Oyun Ayarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Autosave */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-roman-marble-200">Otomatik Kayıt</div>
                  <div className="text-xs text-roman-marble-500">İlerlemeyi otomatik kaydet</div>
                </div>
                <button
                  onClick={() => dispatch(toggleAutosave())}
                  className={clsx(
                    'w-14 h-8 rounded-full transition-all relative',
                    settings.autosave 
                      ? 'bg-roman-gold-600' 
                      : 'bg-roman-marble-700'
                  )}
                >
                  <motion.div
                    animate={{ x: settings.autosave ? 24 : 4 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow"
                  />
                </button>
              </div>

              <Divider variant="subtle" />

              {/* Sound */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-roman-marble-200">Ses Efektleri</div>
                  <div className="text-xs text-roman-marble-500">Ses efektlerini çal</div>
                </div>
                <button
                  onClick={() => dispatch(toggleSound())}
                  className={clsx(
                    'w-14 h-8 rounded-full transition-all relative',
                    settings.soundEnabled 
                      ? 'bg-roman-gold-600' 
                      : 'bg-roman-marble-700'
                  )}
                >
                  <motion.div
                    animate={{ x: settings.soundEnabled ? 24 : 4 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow"
                  />
                </button>
              </div>

              <Divider variant="subtle" />

              {/* Music */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-roman-marble-200">Müzik</div>
                  <div className="text-xs text-roman-marble-500">Arka plan müziğini çal</div>
                </div>
                <button
                  onClick={() => dispatch(toggleMusic())}
                  className={clsx(
                    'w-14 h-8 rounded-full transition-all relative',
                    settings.musicEnabled 
                      ? 'bg-roman-gold-600' 
                      : 'bg-roman-marble-700'
                  )}
                >
                  <motion.div
                    animate={{ x: settings.musicEnabled ? 24 : 4 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow"
                  />
                </button>
              </div>

              <Divider variant="subtle" />

              {/* SFX Volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-roman-marble-200">Ses Düzeyi</div>
                  <span className="text-sm text-roman-marble-400">{Math.round((settings.sfxVolume ?? 0.7) * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-roman-marble-500 text-sm">🔈</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round((settings.sfxVolume ?? 0.7) * 100)}
                    onChange={(e) => dispatch(setSFXVolume(Number(e.target.value) / 100))}
                    disabled={!settings.soundEnabled}
                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-roman-gold-500 bg-roman-marble-700 disabled:opacity-40"
                  />
                  <span className="text-roman-marble-500 text-sm">🔊</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => playSFX('click')}
                    disabled={!settings.soundEnabled}
                  >
                    Test
                  </Button>
                </div>
              </div>

              <Divider variant="subtle" />

              {/* Music Volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-roman-marble-200">Müzik Düzeyi</div>
                  <span className="text-sm text-roman-marble-400">{Math.round((settings.musicVolume ?? 0.4) * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-roman-marble-500 text-sm">🔈</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round((settings.musicVolume ?? 0.4) * 100)}
                    onChange={(e) => dispatch(setMusicVolume(Number(e.target.value) / 100))}
                    disabled={!settings.musicEnabled}
                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-roman-gold-500 bg-roman-marble-700 disabled:opacity-40"
                  />
                  <span className="text-roman-marble-500 text-sm">🔊</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-roman-crimson-400">Tehlikeli Bölge</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-roman-marble-200">Oyunu Sıfırla</div>
                  <div className="text-xs text-roman-crimson-400">Tüm ilerleme silinecek!</div>
                </div>
                <Button 
                  variant="crimson"
                  onClick={() => setShowResetConfirm(true)}
                >
                  Sıfırla
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Credits & Version */}
        <motion.div variants={itemVariants}>
          <Card variant="gold">
            <CardContent className="text-center py-6">
              <h3 className="font-roman text-xl text-roman-gold-400 mb-2">
                Lanista: Rise of Rome
              </h3>
              <p className="text-roman-marble-400 text-sm mb-4">
                Roma Gladyatör Yönetim Simülasyonu
              </p>
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="text-roman-marble-500">
                  Sürüm {APP_VERSION}
                </span>
                <span className="text-roman-marble-600">•</span>
                <a
                  href={`${REPO_URL}/blob/main/CHANGELOG.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-roman-gold-500 hover:text-roman-gold-400 underline underline-offset-2 transition-colors"
                >
                  Değişiklikler
                </a>
                <span className="text-roman-marble-600">•</span>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-roman-gold-500 hover:text-roman-gold-400 underline underline-offset-2 transition-colors"
                >
                  GitHub
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Oyunu Sıfırla?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-roman-marble-300">
            Oyunu sıfırlamak istediğinden emin misin? Bu işlem geri alınamaz ve tüm ilerlemen kaybolur.
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowResetConfirm(false)}
            >
              İptal
            </Button>
            <Button
              variant="crimson"
              className="flex-1"
              onClick={handleReset}
            >
              Oyunu Sıfırla
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
