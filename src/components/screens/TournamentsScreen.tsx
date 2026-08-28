import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '@app/hooks';
import { spendGold } from '@features/player/playerSlice';
import { 
  createTournament, 
  setSelectedGladiators,
  clearSelectedGladiators,
} from '@features/tournaments/tournamentsSlice';
import { Card, CardHeader, CardTitle, CardContent, Button, Modal } from '@components/ui';
import { TOURNAMENT_TYPES, canGladiatorEnterTournament } from '@data/tournaments';
import { TournamentEngine } from '@/game/TournamentEngine';
import type { TournamentTypeData } from '@/types';
import { clsx } from 'clsx';
import { v4 as uuidv4 } from 'uuid';

export const TournamentsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { roster } = useAppSelector(state => state.gladiators);
  const { gold } = useAppSelector(state => state.player);
  const { ludusFame } = useAppSelector(state => state.fame);
  const gameState = useAppSelector(state => state.game);
  const currentDay = ((gameState?.currentYear ?? 73) - 73) * 12 + (gameState?.currentMonth ?? 1);
  const { selectedGladiatorIds } = useAppSelector(state => state.tournaments);

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedTournamentType, setSelectedTournamentType] = useState<TournamentTypeData | null>(null);

  // Available tournaments based on ludus fame
  const availableTournaments = Object.values(TOURNAMENT_TYPES).filter(
    t => ludusFame >= t.minFame
  );

  // Handle tournament type selection
  const handleSelectTournament = (tournament: TournamentTypeData) => {
    setSelectedTournamentType(tournament);
    setShowEntryModal(true);
  };

  // Toggle gladiator selection
  const handleToggleGladiator = (gladiatorId: string) => {
    if (selectedGladiatorIds.includes(gladiatorId)) {
      dispatch(setSelectedGladiators(selectedGladiatorIds.filter(id => id !== gladiatorId)));
    } else {
      dispatch(setSelectedGladiators([...selectedGladiatorIds, gladiatorId]));
    }
  };

  // Enter tournament
  const handleEnterTournament = () => {
    if (!selectedTournamentType || selectedGladiatorIds.length === 0) return;

    const selectedGladiators = roster.filter(g => selectedGladiatorIds.includes(g.id));
    const totalEntryFee = selectedTournamentType.entryFeePerGladiator * selectedGladiators.length;

    // Deduct entry fees
    dispatch(spendGold({
      amount: totalEntryFee,
      description: `Tournament entry: ${selectedTournamentType.name}`,
      category: 'tournament',
      day: currentDay,
    }));

    // Calculate average fame for opponent generation
    const totalFame = selectedGladiators.reduce((sum, g) => sum + g.fame, 0);
    const averageFame = totalFame / selectedGladiators.length;

    // Generate bracket and participants
    const { bracket, participants } = TournamentEngine.generateBracket(
      selectedTournamentType.size,
      selectedGladiators,
      averageFame
    );

    // Create tournament
    dispatch(createTournament({
      id: uuidv4(),
      type: selectedTournamentType.id,
      typeData: selectedTournamentType,
      startDay: currentDay,
      bracket,
      participants,
      playerGladiatorIds: selectedGladiatorIds,
    }));

    // Clear selections and close modal
    dispatch(clearSelectedGladiators());
    setShowEntryModal(false);
    setSelectedTournamentType(null);
  };

  const handleCloseModal = () => {
    setShowEntryModal(false);
    setSelectedTournamentType(null);
    dispatch(clearSelectedGladiators());
  };

  return (
    <div className="space-y-6">

        {/* Tournament Types */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="grid grid-cols-2 gap-6">
          {availableTournaments.length === 0 ? (
            <div className="col-span-2">
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="text-5xl mb-4">🏆</div>
                  <p className="text-roman-marble-400 text-lg">
                    Turnuvaları açmak için ludus şöhretini artır
                  </p>
                  <p className="text-roman-marble-500 text-sm mt-2">
                    Mevcut Şöhret: {ludusFame}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            availableTournaments.map(tournament => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                currentGold={gold}
                onSelect={() => handleSelectTournament(tournament)}
              />
            ))
          )}
          </div>
        </motion.div>

        {/* Entry Modal */}
        {showEntryModal && selectedTournamentType && (
          <Modal
            isOpen={showEntryModal}
            onClose={handleCloseModal}
            title={`Turnuvaya Katıl: ${selectedTournamentType.name}`}
          >
            <div className="space-y-4">
              <div className="bg-roman-stone-800/50 p-4 rounded">
                <h3 className="font-semibold text-roman-gold-400 mb-2">Turnuva Detayları</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-roman-marble-500">Boyut:</span> {selectedTournamentType.size} katılımcı</p>
                  <p><span className="text-roman-marble-500">Kurallar:</span> {selectedTournamentType.rules === 'death' ? 'Sine Missione (Ölüme Kadar)' : 'Teslimiyet'}</p>
                  <p><span className="text-roman-marble-500">Katılım Ücreti:</span> {selectedTournamentType.entryFeePerGladiator} gladyatör başına altın</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-roman-gold-400 mb-3">Gladyatör Seç</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {roster.map(gladiator => {
                    const eligibility = canGladiatorEnterTournament(
                      gladiator.fame,
                      gladiator.currentHP,
                      gladiator.maxHP,
                      gladiator.currentStamina,
                      gladiator.maxStamina,
                      gladiator.isInjured,
                      gladiator.isTraining,
                      gladiator.isResting,
                      selectedTournamentType.minFame
                    );
                    const isSelected = selectedGladiatorIds.includes(gladiator.id);

                    return (
                      <div
                        key={gladiator.id}
                        className={clsx(
                          'p-3 rounded border-2 cursor-pointer transition-colors',
                          isSelected && eligibility.canEnter && 'border-roman-gold-500 bg-roman-gold-500/10',
                          !isSelected && eligibility.canEnter && 'border-roman-stone-600 hover:border-roman-gold-500/50',
                          !eligibility.canEnter && 'border-roman-stone-700 opacity-50 cursor-not-allowed'
                        )}
                        onClick={() => eligibility.canEnter && handleToggleGladiator(gladiator.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-roman-marble-200">{gladiator.name}</p>
                            <p className="text-sm text-roman-marble-500">
                              Seviye {gladiator.level} {gladiator.class} • Şöhret: {gladiator.fame}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            {eligibility.canEnter ? (
                              <>
                                <p className="text-roman-marble-400">HP: {gladiator.currentHP}/{gladiator.maxHP}</p>
                                <p className="text-roman-marble-400">Dayanıklılık: {gladiator.currentStamina}/{gladiator.maxStamina}</p>
                              </>
                            ) : (
                              <p className="text-roman-blood-400">{eligibility.reason}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedGladiatorIds.length > 0 && (
                <div className="bg-roman-stone-800/50 p-3 rounded">
                  <p className="text-sm">
                    <span className="text-roman-marble-500">Toplam Katılım Ücreti:</span>{' '}
                    <span className={clsx(
                      'font-semibold',
                      gold >= selectedTournamentType.entryFeePerGladiator * selectedGladiatorIds.length
                        ? 'text-roman-gold-400'
                        : 'text-roman-blood-400'
                    )}>
                      {selectedTournamentType.entryFeePerGladiator * selectedGladiatorIds.length} altın
                    </span>
                  </p>
                  <p className="text-sm text-roman-marble-500">
                    Seçilen: {selectedGladiatorIds.length} gladyatör
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={handleCloseModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEnterTournament}
                  disabled={
                    selectedGladiatorIds.length === 0 ||
                    gold < selectedTournamentType.entryFeePerGladiator * selectedGladiatorIds.length
                  }
                  className="flex-1"
                >
                  Enter Tournament
                </Button>
              </div>
            </div>
          </Modal>
        )}
    </div>
  );
};

// Tournament Card Component
const TournamentCard: React.FC<{
  tournament: TournamentTypeData;
  currentGold: number;
  onSelect: () => void;
}> = ({ tournament, currentGold, onSelect }) => {
  const canAfford = currentGold >= tournament.entryFeePerGladiator;

  return (
    <Card className="hover:border-roman-gold-500/50 transition-colors">
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <span>{tournament.name}</span>
          <span className="text-2xl">
            {tournament.rules === 'death' ? '⚔️' : '🛡️'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-roman-marble-400">{tournament.description}</p>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-roman-marble-500">Participants:</span>
            <span className="text-roman-marble-200">{tournament.size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-roman-marble-500">Rules:</span>
            <span className={clsx(
              'font-semibold',
              tournament.rules === 'death' ? 'text-roman-blood-400' : 'text-roman-marble-200'
            )}>
              {tournament.rules === 'death' ? 'Sine Missione' : 'Submission'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-roman-marble-500">Entry Fee:</span>
            <span className={clsx(
              'font-semibold',
              canAfford ? 'text-roman-gold-400' : 'text-roman-blood-400'
            )}>
              {tournament.entryFeePerGladiator} gold
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-roman-marble-500">Min. Fame:</span>
            <span className="text-roman-marble-200">{tournament.minFame}</span>
          </div>
        </div>

        <div className="border-t border-roman-stone-700 pt-3">
          <p className="text-xs text-roman-marble-500 mb-2">Rewards (Winner):</p>
          <div className="flex justify-between text-sm">
            <span className="text-roman-gold-400">
              💰 {tournament.placementBonuses.winner.gold} gold
            </span>
            <span className="text-roman-gold-400">
              ⭐ {tournament.placementBonuses.winner.fame} fame
            </span>
          </div>
        </div>

        <Button
          onClick={onSelect}
          disabled={!canAfford}
          className="w-full"
        >
          Select Tournament
        </Button>
      </CardContent>
    </Card>
  );
};
