import React from 'react';
import { motion } from 'framer-motion';
import { useAppDispatch } from '@app/hooks';
import { setScreen, setGameMode } from '@features/game/gameSlice';
import { Button } from '@components/ui';
import type { GameMode } from '@/types';

const modes: { id: GameMode; title: string; subtitle: string; description: string; icon: string }[] = [
  {
    id: 'lanista',
    title: 'Lanista',
    subtitle: "Ludus'un Ustası",
    description: 'Bir gladyatör okulu sahi ol. Savaşçılar topla, tesisler kur, personeli yönet ve kan ile altın üzerine bir imparatorluk inşa et. Gladyatörler senin yatırımıdır — onları savaşa gönder, öldürmeyi eğit ve ödülleri topla.',
    icon: '🏛️',
  },
  {
    id: 'gladiator',
    title: 'Gladyatör',
    subtitle: 'Arenanın Kölesi',
    description: "Hayatta kalmak için savaş. Sen bir mülksün — başkasına ait bir silah. Dominus'una itaat et, kalabalığın sevgisini kazan ve dostlarınla bağlar kur. Nihai amacın: rudis'i kazan ve özgür bir adam ol.",
    icon: '⚔️',
  },
];

export const ModeSelectScreen: React.FC = () => {
  const dispatch = useAppDispatch();

  const handleSelect = (mode: GameMode) => {
    dispatch(setGameMode(mode));
    if (mode === 'lanista') {
      dispatch(setScreen('newGame'));
    } else {
      dispatch(setScreen('newGameGladiator'));
    }
  };

  const handleBack = () => {
    dispatch(setScreen('title'));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-roman-marble-900 via-roman-marble-800 to-roman-marble-900" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-4xl"
      >
        <motion.div variants={itemVariants} className="text-center mb-10">
          <h1 className="font-roman text-4xl md:text-5xl text-gradient-gold mb-3">
            Yolunu Seç
          </h1>
          <p className="text-roman-marble-400 text-lg">
            Arenanın iki yüzü. Kan ve zafer dolu tek bir dünya.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {modes.map((mode) => (
            <motion.button
              key={mode.id}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(mode.id)}
              className="text-left p-8 rounded-lg border-2 border-roman-marble-600 bg-roman-marble-800/80 
                         hover:border-roman-gold-500 hover:bg-roman-marble-800 
                         transition-colors group cursor-pointer"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                {mode.icon}
              </div>
              <h2 className="font-roman text-2xl text-roman-gold-500 mb-1">
                {mode.title}
              </h2>
              <p className="text-sm text-roman-gold-600 uppercase tracking-wider mb-4">
                {mode.subtitle}
              </p>
              <p className="text-roman-marble-300 text-sm leading-relaxed">
                {mode.description}
              </p>
            </motion.button>
          ))}
        </div>

        <motion.div variants={itemVariants} className="text-center">
          <Button variant="ghost" size="lg" onClick={handleBack}>
            Geri
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};
