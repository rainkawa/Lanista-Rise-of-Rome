import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import { startNewGame, setScreen } from '@features/game/gameSlice';
import { initializePlayer, resetPlayer } from '@features/player/playerSlice';
import { resetGladiators } from '@features/gladiators/gladiatorsSlice';
import { resetLudus } from '@features/ludus/ludusSlice';
import { resetStaff } from '@features/staff/staffSlice';
import { resetEconomy } from '@features/economy/economySlice';
import { resetFame } from '@features/fame/fameSlice';
import { resetFactions } from '@features/factions/factionsSlice';
import { resetQuests } from '@features/quests/questsSlice';
import { Button, Card, CardContent } from '@components/ui';
import type { Difficulty } from '@/types';
import { clsx } from 'clsx';

export const NewGameScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const prestigeLevel = useAppSelector(state => state.game?.prestigeLevel ?? 0);
  const [playerName, setPlayerName] = useState('');
  const [ludusName, setLudusName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const prestigeBonus = prestigeLevel * 250;
  const difficulties: { id: Difficulty; label: string; description: string; gold: number }[] = [
    { id: 'easy', label: 'Çırak', description: 'Arenaya yeni başlayanlar için', gold: 1500 + prestigeBonus },
    { id: 'normal', label: 'Gladyatör', description: 'Gerçek Roma deneyimi', gold: 1250 + prestigeBonus },
    { id: 'hard', label: 'Şampiyon', description: 'Sadece değer olanlar hayatta kalır', gold: 1000 + prestigeBonus },
  ];

  const handleStartGame = () => {
    if (!playerName.trim() || !ludusName.trim()) return;

    // Reset all state
    dispatch(resetPlayer());
    dispatch(resetGladiators());
    dispatch(resetLudus());
    dispatch(resetStaff());
    dispatch(resetEconomy());
    dispatch(resetFame());
    dispatch(resetFactions());
    dispatch(resetQuests());

    // Initialize new game
    dispatch(initializePlayer({
      name: playerName.trim(),
      ludusName: ludusName.trim(),
      difficulty,
      prestigeBonus,
    }));
    dispatch(startNewGame({ difficulty }));
  };

  const handleBack = () => {
    dispatch(setScreen('title'));
  };

  const isValid = playerName.trim().length > 0 && ludusName.trim().length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <Card variant="gold" className="p-8">
          <CardContent>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="font-roman text-3xl text-roman-gold-500 mb-2">
                Mirasını Başlat
              </h1>
              <p className="text-roman-marble-400">
                Gladyatör okulunu kur ve adını tarihe yaz
              </p>
            </div>

            {/* Form */}
            <div className="space-y-6">
              {/* Lanista Name */}
              <div>
                <label className="block font-roman text-sm text-roman-gold-400 uppercase tracking-wide mb-2">
                  Adın (Lanista)
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Adını gir..."
                  className="w-full px-4 py-3 bg-roman-marble-800 border border-roman-marble-600 rounded
                           text-roman-marble-100 placeholder-roman-marble-500
                           focus:outline-none focus:border-roman-gold-500 focus:ring-1 focus:ring-roman-gold-500
                           transition-colors"
                  maxLength={20}
                />
              </div>

              {/* Ludus Name */}
              <div>
                <label className="block font-roman text-sm text-roman-gold-400 uppercase tracking-wide mb-2">
                  Okul Adı (Ludus)
                </label>
                <input
                  type="text"
                  value={ludusName}
                  onChange={(e) => setLudusName(e.target.value)}
                  placeholder="Okulunun adını gir..."
                  className="w-full px-4 py-3 bg-roman-marble-800 border border-roman-marble-600 rounded
                           text-roman-marble-100 placeholder-roman-marble-500
                           focus:outline-none focus:border-roman-gold-500 focus:ring-1 focus:ring-roman-gold-500
                           transition-colors"
                  maxLength={25}
                />
              </div>

              {/* Difficulty Selection */}
              <div>
                <label className="block font-roman text-sm text-roman-gold-400 uppercase tracking-wide mb-3">
                  Zorluk
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {difficulties.map((diff) => (
                    <button
                      key={diff.id}
                      onClick={() => setDifficulty(diff.id)}
                      className={clsx(
                        'p-4 rounded border-2 text-center transition-all',
                        difficulty === diff.id
                          ? 'border-roman-gold-500 bg-roman-gold-500/10'
                          : 'border-roman-marble-600 bg-roman-marble-800 hover:border-roman-marble-500'
                      )}
                    >
                      <div className="font-roman text-lg text-roman-marble-100 mb-1">
                        {diff.label}
                      </div>
                      <div className="text-xs text-roman-marble-400 mb-2">
                        {diff.description}
                      </div>
                      <div className="text-sm text-roman-gold-500">
                        🪙 {diff.gold} altın
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="divider-roman my-8" />

              {/* Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handleBack}
                  className="flex-1"
                >
                  Geri
                </Button>
                <Button
                  variant="gold"
                  size="lg"
                  onClick={handleStartGame}
                  disabled={!isValid}
                  className="flex-1"
                >
                  Başla
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
