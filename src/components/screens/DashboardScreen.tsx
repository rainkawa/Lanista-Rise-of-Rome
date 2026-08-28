import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '@app/hooks';
import { 
  advanceMonth, 
  setScreen,
  setMonthReport,
  hideMonthReport,
  setUnrestLevel,
  setGameOver,
  recordBrokeMonth,
  resetBrokeMonths,
  getMonthName,
  getSeason,
} from '@features/game/gameSlice';
import { addGold, spendGold, consumeResource } from '@features/player/playerSlice';
import { NUTRITION_OPTIONS, type NutritionQuality } from '@data/training';
import { calculateStaffBonuses } from '@data/staff';
import { tickCooldowns as tickQuestCooldowns, incrementObjective, updateObjective } from '@features/quests/questsSlice';
import { tickCooldowns as tickFactionCooldowns, setPendingSabotage } from '@features/factions/factionsSlice';
import { checkSabotageRisk } from '@data/factions';
import { updateSponsorships, addLudusFame } from '@features/fame/fameSlice';
import { getQuestById } from '@data/quests';
import { calculateMerchandiseIncome, MERCHANDISE_ITEMS } from '@data/fame';
import { 
  updateConstructionProgress, 
  completeConstruction,
  updateUpgradeProgress,
  completeUpgrade,
  calculateSecurityRating,
  updateBuilding,
} from '@features/ludus/ludusSlice';
import { applyMonthlyDegradation, getConditionCategory } from '@/utils/buildingMaintenance';
import { checkMilestones, awardMilestone } from '@/utils/milestoneSystem';
import { getEventsForMonth } from '@/data/historicalEvents';
import { LOAN_TYPES, calculateMonthlyPayment, calculateTotalRepayment, calculateEarlyPayoff } from '@/data/loans';
import { MONTHLY_FOOD_COST_PER_GLADIATOR, SEASONAL_FOOD_MODIFIERS } from '@/data/constants';
import { takeLoan, payOffLoan, refinanceLoan } from '@features/loans/loansSlice';
import { updateGladiator, removeGladiator } from '@features/gladiators/gladiatorsSlice';
import { addExperience as addStaffExperience } from '@features/staff/staffSlice';
import { makePayment, missPayment } from '@features/loans/loansSlice';
import { adjustFavor } from '@features/factions/factionsSlice';
import { Card, CardHeader, CardTitle, CardContent, Button, ProgressBar, Modal } from '@components/ui';
import { MainLayout } from '@components/layout';
import { processGladiatorDay, calculateUnrest, rollRandomEvent, type RandomEvent } from '../../game/GameLoop';
import { clsx } from 'clsx';

export const DashboardScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector(state => state.game);
  const currentYear = gameState?.currentYear || 73;
  const currentMonth = gameState?.currentMonth || 1;
  const showMonthReport = gameState?.showMonthReport || false;
  const lastMonthReport = gameState?.lastMonthReport || null;
  const unrestLevel = gameState?.unrestLevel || 0;
  const rebellionWarning = gameState?.rebellionWarning || false;
  const consecutiveBrokeMonths = gameState?.consecutiveBrokeMonths || 0;
  const brokeMonthsRef = useRef(consecutiveBrokeMonths);
  brokeMonthsRef.current = consecutiveBrokeMonths;
  
  // For systems that still need a day number (backward compatibility)
  const currentDay = (currentYear - 73) * 12 + currentMonth;
  
  // Get current season
  const currentSeason = getSeason(currentMonth);

  const playerState = useAppSelector(state => state.player);
  const gold = playerState?.gold || 0;
  const resources = playerState?.resources || { grain: 0, water: 0, wine: 0 };
  const ludusName = playerState?.ludusName || 'Ludus';
  const name = playerState?.name || 'Lanista';
  
  const fameState = useAppSelector(state => state.fame);
  const ludusFame = fameState?.ludusFame || 0;
  const ownedMerchandise = fameState?.ownedMerchandise || [];
  const activeSponsorships = fameState?.activeSponsorships || [];
  
  const gladiatorsState = useAppSelector(state => state.gladiators);
  const roster = gladiatorsState?.roster || [];
  
  const ludusState = useAppSelector(state => state.ludus);
  const buildings = ludusState?.buildings || [];
  
  const staffState = useAppSelector(state => state.staff);
  const employees = staffState?.employees || [];
  const totalDailyWages = staffState?.totalDailyWages || 0;
  
  const questsState = useAppSelector(state => state.quests);
  const activeQuests = questsState?.activeQuests || [];

  const factionsState = useAppSelector(state => state.factions);
  const factionFavors = factionsState?.factionFavors || { optimates: 0, populares: 0, military: 0, merchants: 0 };
  const protectionLevel = factionsState?.protectionLevel || 0;

  const loansState = useAppSelector(state => state.loans);
  const activeLoans = loansState?.activeLoans.filter(loan => loan.isActive) || [];

  const [processingMonth, setProcessingMonth] = useState(false);
  const [showLoansModal, setShowLoansModal] = useState(false);
  const [selectedLoanType, setSelectedLoanType] = useState<'short' | 'medium' | 'long' | null>(null);
  const [loanAmount, setLoanAmount] = useState(0);

  // Calculate monthly expenses with seasonal modifiers
  const seasonalFoodModifier = SEASONAL_FOOD_MODIFIERS[currentSeason.name] ?? 1.0;
  const foodCosts = Math.round(roster.length * MONTHLY_FOOD_COST_PER_GLADIATOR * seasonalFoodModifier);

  // Process end of month
  const handleEndMonth = useCallback(() => {
    setProcessingMonth(true);
    
    const income: { source: string; amount: number }[] = [];
    const expenses: { source: string; amount: number }[] = [];
    const events: string[] = [];
    const alerts: { severity: 'info' | 'warning' | 'danger'; message: string }[] = [];
    
    // Track available gold for sequential payments
    let availableGold = gold;

    // Process expenses
    if (totalDailyWages > 0) {
      expenses.push({ source: 'Personel Ücretleri', amount: totalDailyWages });
      availableGold -= totalDailyWages;
    }
    if (foodCosts > 0) {
      expenses.push({ source: 'Yemek ve Malzeme', amount: foodCosts });
      availableGold -= foodCosts;
    }

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Fame-based income (tier bonus)
    const fameIncome = Math.floor(ludusFame / 100) * 10;
    if (fameIncome > 0) {
      income.push({ source: 'Şöhret Geliri', amount: fameIncome });
    }

    // Merchandise income
    const totalGladiatorFame = roster.reduce((sum, g) => sum + (g.fame || 0), 0);
    const merchIncome = ownedMerchandise
      .filter(m => m.isActive)
      .reduce((sum, m) => {
        const item = MERCHANDISE_ITEMS.find(i => i.id === m.itemId);
        return sum + (item ? calculateMerchandiseIncome(item, ludusFame, totalGladiatorFame) : 0);
      }, 0);
    if (merchIncome > 0) {
      income.push({ source: 'Mal Satışı', amount: merchIncome });
    }

    // Sponsorship income
    const sponsorIncome = activeSponsorships.reduce((sum, s) => sum + s.dailyPayment, 0);
    if (sponsorIncome > 0) {
      income.push({ source: 'Sponsorluklar', amount: sponsorIncome });
    }

    // NOTE: Gold dispatches are deferred to the end of the function.
    // Income and expenses are tracked in arrays first, then applied in a single batch
    // after all sources (milestones, events, maintenance, loans) have been collected.
    // availableGold is used as a local estimate for affordability checks.
    availableGold = gold - totalExpenses;

    // Calculate and consume resources for gladiators based on nutrition
    let totalGrainConsumed = 0;
    let totalWaterConsumed = 0;
    let totalWineConsumed = 0;
    
    roster.forEach(gladiator => {
      const nutritionLevel = (gladiator.nutrition || 'standard') as NutritionQuality;
      const nutrition = NUTRITION_OPTIONS[nutritionLevel];
      
      totalGrainConsumed += nutrition.dailyCost.grain;
      totalWaterConsumed += nutrition.dailyCost.water;
      totalWineConsumed += nutrition.dailyCost.wine || 0;
    });
    
    // Check if we have enough resources
    if (resources.grain < totalGrainConsumed) {
      alerts.push({
        severity: 'warning',
        message: `Not enough grain! Need ${totalGrainConsumed}, have ${resources.grain}. Gladiators will suffer.`,
      });
    }
    if (resources.water < totalWaterConsumed) {
      alerts.push({
        severity: 'warning',
        message: `Not enough water! Need ${totalWaterConsumed}, have ${resources.water}. Gladiators will suffer.`,
      });
    }
    
    // Consume resources
    if (totalGrainConsumed > 0) {
      dispatch(consumeResource({ resource: 'grain', amount: totalGrainConsumed }));
      events.push(`Consumed ${totalGrainConsumed} grain`);
    }
    if (totalWaterConsumed > 0) {
      dispatch(consumeResource({ resource: 'water', amount: totalWaterConsumed }));
      events.push(`Consumed ${totalWaterConsumed} water`);
    }
    if (totalWineConsumed > 0) {
      dispatch(consumeResource({ resource: 'wine', amount: totalWineConsumed }));
      events.push(`Consumed ${totalWineConsumed} wine`);
    }

    // Calculate staff bonuses for gladiator processing
    const staffBonuses = calculateStaffBonuses(
      employees.map(e => ({ role: e.role, level: e.level, skills: e.skills })),
      buildings.map(b => ({ type: b.type, level: b.level }))
    );

    // Add base bonuses from having staff (even without skills)
    // Doctore: +25% training XP
    const hasDoctore = employees.some(e => e.role === 'doctore');
    if (hasDoctore) {
      staffBonuses.trainingXP = (staffBonuses.trainingXP || 0) + 25;
    }
    // Medicus: +30% healing speed
    const medicusCount = employees.filter(e => e.role === 'medicus').length;
    if (medicusCount > 0) {
      staffBonuses.healingSpeed = (staffBonuses.healingSpeed || 0) + 30 * medicusCount;
    }
    // Coquus: +15% nutrition effectiveness
    const coquusCount = employees.filter(e => e.role === 'coquus').length;
    if (coquusCount > 0) {
      staffBonuses.nutritionValue = (staffBonuses.nutritionValue || 0) + 15 * coquusCount;
    }

    // Process gladiator recovery and aging
    const gladiatorsToRemove: string[] = []; // Track gladiators who died
    
    roster.forEach(gladiator => {
      const { updates, events: gladEvents, died } = processGladiatorDay(
        gladiator,
        gladiator.isTraining || false,
        gladiator.isResting || false,
        staffBonuses,
        currentYear,
        currentMonth
      );
      
      // If gladiator died from old age, mark for removal
      if (died) {
        gladiatorsToRemove.push(gladiator.id);
        events.push(`${gladiator.name}: ${gladEvents.join(', ')}`);
        return; // Skip further processing
      }
      
      // Check for any pending level-ups (for existing saves with excess XP)
      let currentXP = updates.experience !== undefined ? updates.experience : gladiator.experience;
      let currentLevel = updates.level !== undefined ? updates.level : gladiator.level;
      let currentSkillPoints = updates.skillPoints !== undefined ? updates.skillPoints : (gladiator.skillPoints || 0);
      let xpToLevel = currentLevel * 100;
      
      while (currentXP >= xpToLevel && currentLevel < 20) {
        currentXP -= xpToLevel;
        currentLevel += 1;
        currentSkillPoints += 5;
        gladEvents.push(`🎉 LEVEL UP! Now level ${currentLevel}! +5 skill points`);
        xpToLevel = currentLevel * 100; // Update for next iteration
      }
      
      // If leveling occurred, update the updates object
      if (currentLevel > gladiator.level) {
        updates.level = currentLevel;
        updates.skillPoints = currentSkillPoints;
        updates.experience = currentXP;
        // Update derived stats on level up
        updates.maxHP = 50 + currentLevel * 10 + Math.round(gladiator.stats.constitution * 2);
        updates.maxStamina = 50 + currentLevel * 5 + Math.round(gladiator.stats.endurance * 1.5);
      }
      
      // Check for milestone achievements
      const updatedGladiator = { 
        ...gladiator, 
        ...updates,
        // Ensure milestone-related fields exist for older gladiators
        milestones: gladiator.milestones || [],
        monthsOfService: gladiator.monthsOfService ?? 0,
        titles: gladiator.titles || [],
      };
      const newMilestones = checkMilestones(updatedGladiator, currentYear, currentMonth);
      
      if (newMilestones.length > 0) {
        newMilestones.forEach(milestone => {
          const milestoneResult = awardMilestone(updatedGladiator, milestone, currentYear, currentMonth);
          
          // Apply milestone updates
          Object.assign(updates, milestoneResult.updates);
          
          // Add gold reward if any
          if (milestoneResult.goldReward) {
            income.push({ source: `Milestone: ${milestone.name}`, amount: milestoneResult.goldReward });
          }
          
          // Add notification
          events.push(milestoneResult.notification);
        });
      }
      
      // Apply the updates to the gladiator
      if (Object.keys(updates).length > 0) {
        dispatch(updateGladiator({ id: gladiator.id, updates }));
      }
      
      if (gladEvents.length > 0) {
        events.push(`${gladiator.name}: ${gladEvents.join(', ')}`);
      }
    });
    
    // Remove gladiators who died from old age
    if (gladiatorsToRemove.length > 0) {
      gladiatorsToRemove.forEach(id => {
        dispatch(removeGladiator(id));
      });
    }

    // Update reach_level quest objectives with highest gladiator level
    const highestLevel = roster.length > 0 
      ? Math.max(...roster.map(g => g.level))
      : 0;
    
    activeQuests.forEach(activeQuest => {
      const questDef = getQuestById(activeQuest.questId);
      if (!questDef) return;
      
      questDef.objectives.forEach(objective => {
        if (objective.type === 'reach_level') {
          dispatch(updateObjective({
            questId: activeQuest.questId,
            objectiveId: objective.id,
            progress: highestLevel,
            required: objective.required,
          }));
        }
      });
    });

    // Calculate unrest
    const averageMorale = roster.length > 0 
      ? roster.reduce((sum, g) => sum + (g.morale || 1), 0) / roster.length 
      : 1;
    const hasGuards = employees.some(e => e.role === 'guard');
    const unrest = calculateUnrest(roster, {
      averageMorale,
      daysUnpaidWages: gold < totalExpenses ? 1 : 0,
      recentDeaths: 0,
      hasGuards,
      ludusLevel: buildings.length,
    });
    dispatch(setUnrestLevel(unrest.level));

    if (unrest.riskOfRebellion) {
      alerts.push({
        severity: 'danger',
        message: 'Gladiator unrest is dangerously high! Risk of rebellion!',
      });

      // Rebellion consequences (30% chance when risk is active)
      if (Math.random() < 0.3) {
        const rebellionRoll = Math.random();

        if (rebellionRoll < 0.3 && roster.length > 1) {
          // Gladiator escapes
          const escapeCandidate = roster.filter(g => (g.morale || 1) < 0.5)[0] || roster[roster.length - 1];
          dispatch(removeGladiator(escapeCandidate.id));
          events.push(`🏃 REBELLION: ${escapeCandidate.name} has escaped the ludus!`);
          alerts.push({ severity: 'danger', message: `${escapeCandidate.name} escaped during the unrest!` });
        } else if (rebellionRoll < 0.6 && employees.length > 0) {
          // Staff desertion — pick the least essential role
          const deserter = employees[employees.length - 1];
          events.push(`👤 UNREST: A ${deserter.role} has quit due to dangerous conditions!`);
          alerts.push({ severity: 'danger', message: `Your ${deserter.role} deserted due to unrest!` });
        } else if (rebellionRoll < 0.85 && buildings.length > 0) {
          // Building damage
          const targetBuilding = buildings[Math.floor(Math.random() * buildings.length)];
          const newCondition = Math.max(0, (targetBuilding.condition ?? 100) - 25);
          dispatch(updateBuilding({ id: targetBuilding.id, updates: { condition: newCondition } }));
          events.push(`🔥 REBELLION: Gladiators damaged the ${targetBuilding.type}! Condition dropped by 25%.`);
          alerts.push({ severity: 'danger', message: `${targetBuilding.type} was damaged in the unrest!` });
        } else {
          // Gold theft
          const stolenAmount = Math.min(gold, Math.round(gold * 0.1));
          if (stolenAmount > 0) {
            expenses.push({ source: 'İsyan: Çalınan Altın', amount: stolenAmount });
            events.push(`💰 REBELLION: ${stolenAmount} gold was stolen during the unrest!`);
          }
        }
      }
    } else if (unrest.level > 50) {
      alerts.push({
        severity: 'warning',
        message: 'Gladiators are becoming restless. Consider improving conditions.',
      });
    }

    // Random event
    const randomEvent: RandomEvent | null = rollRandomEvent(currentDay, ludusFame);
    if (randomEvent) {
      events.push(`Event: ${randomEvent.title}`);
      randomEvent.effects.forEach((effect: RandomEvent['effects'][0]) => {
        if (effect.type === 'gold') {
          if (effect.value > 0) {
            income.push({ source: randomEvent.title, amount: effect.value });
          } else {
            expenses.push({ source: randomEvent.title, amount: -effect.value });
          }
        }
        if (effect.type === 'fame') {
          events.push(`+${effect.value} Fame from ${randomEvent.title}`);
        }
      });
    }

    // Process building construction, upgrades, and degradation
    buildings.forEach(building => {
      // Handle construction
      if (building.isUnderConstruction && building.constructionDaysRemaining !== undefined) {
        const newDays = building.constructionDaysRemaining - 1;
        if (newDays <= 0) {
          dispatch(completeConstruction(building.id));
          events.push(`Construction complete: ${building.type}`);
          
          // Update quest objectives for building completion
          activeQuests.forEach(activeQuest => {
            const questDef = getQuestById(activeQuest.questId);
            if (!questDef) return;
            
            questDef.objectives.forEach(objective => {
              // Check if this objective is for building this specific type
              if (objective.type === 'build' && objective.target === building.type) {
                dispatch(incrementObjective({
                  questId: activeQuest.questId,
                  objectiveId: objective.id,
                  amount: 1,
                  required: objective.required,
                }));
              }
            });
          });
        } else {
          dispatch(updateConstructionProgress({ id: building.id, daysRemaining: newDays }));
        }
      }
      
      // Handle upgrades
      if (building.isUpgrading && building.upgradeDaysRemaining !== undefined) {
        const newDays = building.upgradeDaysRemaining - 1;
        if (newDays <= 0) {
          dispatch(completeUpgrade(building.id));
          events.push(`Upgrade complete: ${building.type} to level ${building.level + 1}`);
        } else {
          dispatch(updateUpgradeProgress({ id: building.id, daysRemaining: newDays }));
        }
      }
      
      // Handle monthly degradation (if building has condition tracking)
      if (building.condition !== undefined && building.condition !== null) {
        // Determine if maintenance can be paid
        const maintenanceCost = building.maintenanceCost ?? 0;
        const canAffordMaintenance = availableGold >= maintenanceCost;
        let maintenancePaid = false;
        
        if (canAffordMaintenance && maintenanceCost > 0) {
          expenses.push({ source: `Maintenance: ${building.type}`, amount: maintenanceCost });
          availableGold -= maintenanceCost;
          maintenancePaid = true;
        }
        
        const degradationUpdates = applyMonthlyDegradation(building, maintenancePaid);
        
        if (degradationUpdates.condition !== building.condition) {
          dispatch(updateBuilding({ id: building.id, updates: degradationUpdates }));
          
          // Notify if building condition becomes concerning
          const newCondition = degradationUpdates.condition!;
          const conditionInfo = getConditionCategory(newCondition);
          
          if (newCondition < 50 && building.condition >= 50) {
            events.push(`⚠️ ${building.type}: Condition is now ${conditionInfo.label} (${Math.round(newCondition)}%)`);
          } else if (newCondition < 25 && building.condition >= 25) {
            events.push(`🚨 ${building.type}: Building is ${conditionInfo.label}! Non-functional!`);
          }
        }
        
        // Warn if maintenance could not be paid
        if (!maintenancePaid && maintenanceCost > 0) {
          events.push(`⚠️ Could not afford maintenance for ${building.type} (${maintenanceCost}g)`);
        }
      }
    });

    // Process staff experience gain
    employees.forEach(staff => {
      let xpGain = 5; // Base XP for working a day
      
      // Role-specific XP bonuses based on StaffRole type
      switch (staff.role) {
        case 'doctore':
          // Doctore (trainer) gains extra XP when gladiators train
          const trainingGladiators = roster.filter(g => g.isTraining).length;
          xpGain += trainingGladiators * 3;
          if (trainingGladiators > 0) {
            events.push(`${staff.name} trained ${trainingGladiators} gladiator(s)`);
          }
          break;
        case 'medicus':
          // Medicus (physician) gains XP when healing injured gladiators
          const injuredGladiators = roster.filter(g => g.isInjured || g.currentHP < g.maxHP).length;
          xpGain += injuredGladiators * 3;
          if (injuredGladiators > 0) {
            events.push(`${staff.name} treated ${injuredGladiators} gladiator(s)`);
          }
          break;
        case 'coquus':
          // Coquus (cook) gains XP based on number of gladiators fed
          xpGain += roster.length * 2;
          break;
        case 'guard':
          // Guard gains XP for maintaining security
          xpGain += Math.floor(roster.length / 2) + 2;
          break;
        case 'lanista':
          // Lanista (manager) gains XP based on gold transactions
          xpGain += Math.min(10, Math.floor((income.reduce((s, i) => s + i.amount, 0) + expenses.reduce((s, e) => s + e.amount, 0)) / 50));
          break;
        case 'lorarius':
          // Lorarius (disciplinarian) gains XP for keeping order
          xpGain += Math.floor(roster.length / 2) + 3;
          break;
        case 'faber':
          // Faber (craftsman) gains XP from building maintenance
          const activeBuildings = buildings.filter(b => !b.isUnderConstruction).length;
          xpGain += activeBuildings * 2;
          break;
      }
      
      // Check for level up before applying XP (to detect if level up will happen)
      const currentXP = staff.experience;
      const xpToLevel = staff.level * 50;
      const willLevelUp = (currentXP + xpGain) >= xpToLevel && staff.level < 5;
      
      // Apply XP gain (auto level-up happens in the reducer)
      dispatch(addStaffExperience({ id: staff.id, amount: xpGain }));
      
      if (willLevelUp) {
        events.push(`🎉 ${staff.name} leveled up to Level ${staff.level + 1}!`);
      }
    });

    // Process loan payments
    if (activeLoans.length > 0) {
      activeLoans.forEach(loan => {
        const canAffordPayment = availableGold >= loan.monthlyPayment;
        
        if (canAffordPayment) {
          dispatch(makePayment({ 
            loanId: loan.id, 
            currentMonth, 
            currentYear 
          }));
          expenses.push({ source: `Loan Payment (${loan.type})`, amount: loan.monthlyPayment });
          availableGold -= loan.monthlyPayment;
          
          // Check if loan is completed
          if (loan.monthsPaid + 1 >= loan.durationMonths) {
            events.push(`✅ Loan fully repaid! (${loan.type}-term)`);
          }
        } else {
          // Missed payment
          dispatch(missPayment({ 
            loanId: loan.id, 
            currentMonth, 
            currentYear 
          }));
          
          const loanType = LOAN_TYPES[loan.type];
          const totalMissed = (loan.missedPayments ?? 0) + 1;
          
          // Faction favor penalty every missed payment
          dispatch(adjustFavor({ 
            faction: 'optimates', 
            amount: -loanType.missedPaymentPenalty.factionFavorLoss 
          }));
          events.push(`❌ MISSED LOAN PAYMENT (${loan.type})! ${totalMissed} total missed. -${loanType.missedPaymentPenalty.factionFavorLoss} Optimates favor`);
          
          // Escalating consequences based on total missed payments
          if (totalMissed >= 3 && totalMissed < 6) {
            // Creditors seize a building
            const seizable = buildings.filter(b => !b.isUnderConstruction);
            if (seizable.length > 0 && Math.random() < 0.3) {
              const seized = seizable[Math.floor(Math.random() * seizable.length)];
              dispatch(updateBuilding({ id: seized.id, updates: { condition: Math.max(0, (seized.condition ?? 100) - 40) } }));
              events.push(`🏛️ DEBT COLLECTORS damaged your ${seized.type}! -40% condition.`);
              alerts.push({ severity: 'danger', message: `Creditors damaged your ${seized.type} as collateral!` });
            }
          }
          
          if (totalMissed >= 6 && totalMissed < 10) {
            // Creditors confiscate gladiators
            if (roster.length > 1 && Math.random() < 0.3) {
              const cheapest = [...roster].sort((a, b) => (a.fame || 0) - (b.fame || 0))[0];
              dispatch(removeGladiator(cheapest.id));
              events.push(`⛓️ DEBT ENFORCEMENT: ${cheapest.name} was seized by creditors to cover your debts!`);
              alerts.push({ severity: 'danger', message: `${cheapest.name} confiscated by creditors! (${totalMissed} missed payments)` });
            }
          }
          
          if (totalMissed >= 10) {
            // Game over — total default
            dispatch(setGameOver(`Catastrophic debt default. With ${totalMissed} missed loan payments, Roman creditors have petitioned the magistrate. Your ludus, property, and remaining gladiators have been seized. You have been declared infamis — disgraced and ruined.`));
            alerts.push({ severity: 'danger', message: 'GAME OVER: Total loan default — your ludus has been seized!' });
          } else if (totalMissed >= 6) {
            alerts.push({ severity: 'danger', message: `⚠️ ${totalMissed}/10 missed payments! Creditors are seizing assets. Game over at 10!` });
          } else if (totalMissed >= 3) {
            alerts.push({ severity: 'warning', message: `${totalMissed} missed payments. Creditors are getting aggressive.` });
          }
        }
      });
    }

    // Process historical events and apply their effects
    const monthlyEvents = getEventsForMonth(currentYear, currentMonth);
    if (monthlyEvents.length > 0) {
      monthlyEvents.forEach(event => {
        events.push(`📅 ${event.name}: ${event.description}`);
        
        event.effects.forEach(effect => {
          events.push(`  └─ ${effect.description}`);

          switch (effect.type) {
            case 'gold_change': {
              const amount = effect.value || 0;
              if (amount > 0) {
                income.push({ source: `Event: ${event.name}`, amount });
              } else if (amount < 0) {
                expenses.push({ source: `Event: ${event.name}`, amount: Math.abs(amount) });
              }
              break;
            }
            case 'fame_change': {
              const amount = effect.value || 0;
              dispatch(addLudusFame({ amount, source: `event_${event.id}`, day: currentDay }));
              break;
            }
            case 'faction_favor': {
              if (effect.factionId && effect.value) {
                dispatch(adjustFavor({ faction: effect.factionId as 'optimates' | 'populares' | 'military' | 'merchants', amount: effect.value }));
              }
              break;
            }
            case 'gladiator_morale': {
              const moraleChange = effect.value || 0;
              roster.forEach(g => {
                const newMorale = Math.max(0, Math.min(1.5, (g.morale || 1) + moraleChange));
                dispatch(updateGladiator({ id: g.id, updates: { morale: newMorale } }));
              });
              break;
            }
            case 'tax_payment': {
              const taxRate = effect.value || 0.1;
              const taxAmount = Math.round(gold * taxRate);
              if (taxAmount > 0) {
                expenses.push({ source: 'İmparatorluk Vergisi', amount: taxAmount });
              }
              break;
            }
            case 'resource_change': {
              // Resources are managed through the player slice
              break;
            }
            case 'tournament_unlock':
            case 'market_price_change':
              // Market price changes would need an economy system update; logged for now
              break;
          }
        });
      });
    }

    // Apply seasonal effects
    const season = getSeason(currentMonth);
    if (season.name === 'Winter') {
      events.push(`${season.icon} ${season.name} (${season.latin}): Food costs increased by 25%. Harsh conditions.`);
    } else if (season.name === 'Autumn') {
      events.push(`${season.icon} ${season.name} (${season.latin}): Harvest season — food costs reduced by 15%.`);
    } else if (season.name === 'Spring') {
      events.push(`${season.icon} ${season.name} (${season.latin}): New beginnings — gladiator morale boosted.`);
      roster.forEach(g => {
        const newMorale = Math.min(1.5, (g.morale || 1) + 0.03);
        dispatch(updateGladiator({ id: g.id, updates: { morale: newMorale } }));
      });
    } else if (season.name === 'Summer') {
      events.push(`${season.icon} ${season.name} (${season.latin}): Peak games season — crowds are larger.`);
    }

    // Calculate security rating (guards + buildings)
    const guards = employees.filter(e => e.role === 'guard');
    const guardCount = guards.length;
    // Calculate bonus from guard skills (vigilant +5, intimidating +5, elite +10)
    let guardSkillBonus = 0;
    guards.forEach(guard => {
      if (guard.skills.includes('guard_vigilant')) guardSkillBonus += 5;
      if (guard.skills.includes('guard_intimidating')) guardSkillBonus += 5;
      if (guard.skills.includes('guard_elite')) guardSkillBonus += 10;
      // Level bonus: +2 security per guard level
      guardSkillBonus += (guard.level - 1) * 2;
    });
    dispatch(calculateSecurityRating({ guardCount, guardSkillBonus }));

    // Tick cooldowns and update time-based systems
    dispatch(tickQuestCooldowns());
    dispatch(tickFactionCooldowns());
    dispatch(updateSponsorships());

    // Check for sabotage from hostile factions
    const sabotageCheck = checkSabotageRisk(factionFavors, protectionLevel + guardCount * 5);
    if (sabotageCheck.willOccur && sabotageCheck.event) {
      dispatch(setPendingSabotage({
        eventId: sabotageCheck.event.id,
        perpetrator: sabotageCheck.event.perpetrator,
        preventionCost: sabotageCheck.event.preventionCost,
      }));
      alerts.push({
        severity: 'danger',
        message: `⚠️ Sabotage attempt detected: ${sabotageCheck.event.name}! Check Politics screen.`,
      });
    }

    // Recalculate totals now that ALL sources have been collected
    const finalTotalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const finalTotalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const goldAvailable = gold + finalTotalIncome;
    const actualTotalSpent = Math.min(finalTotalExpenses, Math.max(0, goldAvailable));

    // Check for shortfall
    if (finalTotalExpenses > goldAvailable) {
      const shortfall = finalTotalExpenses - goldAvailable;
      if (!alerts.some(a => a.message.includes('Short'))) {
        alerts.push({
          severity: 'danger',
          message: `Insufficient gold for monthly expenses! Short ${shortfall}g. Staff morale may suffer.`,
        });
      }
    }

    // Apply gold in a single batch: add income, then deduct expenses
    if (finalTotalIncome > 0) {
      dispatch(addGold({
        amount: finalTotalIncome,
        description: 'Monthly Income',
        category: 'monthly',
        day: currentDay,
      }));
    }
    if (actualTotalSpent > 0) {
      dispatch(spendGold({
        amount: actualTotalSpent,
        description: 'Monthly Expenses',
        category: 'monthly',
        day: currentDay,
      }));
    }

    // Bankruptcy consequences — use ref to always read the latest value
    const isBroke = finalTotalExpenses > goldAvailable;
    if (isBroke) {
      dispatch(recordBrokeMonth());
      const brokeMonths = brokeMonthsRef.current + 1;

      events.push(`😤 Gladiators are hungry and discontented! (${brokeMonths} month${brokeMonths > 1 ? 's' : ''} in debt)`);

      // Morale drops for all gladiators when unfed/unpaid
      roster.forEach(g => {
        const moraleDrop = Math.min(0.15, brokeMonths * 0.05);
        const newMorale = Math.max(0, (g.morale || 1) - moraleDrop);
        dispatch(updateGladiator({ id: g.id, updates: { morale: newMorale } }));
      });

      if (brokeMonths >= 2 && employees.length > 0) {
        const quitChance = Math.min(0.5, brokeMonths * 0.15);
        if (Math.random() < quitChance) {
          const quitter = employees[employees.length - 1];
          events.push(`👤 ${quitter.role.charAt(0).toUpperCase() + quitter.role.slice(1)} quit! ${brokeMonths} months without pay.`);
          alerts.push({ severity: 'danger', message: `Your ${quitter.role} left due to unpaid wages!` });
        }
      }

      if (brokeMonths >= 3 && roster.length > 1) {
        const escapeChance = Math.min(0.4, (brokeMonths - 2) * 0.15);
        const lowMoraleGladiators = roster.filter(g => (g.morale || 1) < 0.4);
        if (Math.random() < escapeChance && lowMoraleGladiators.length > 0) {
          const escapee = lowMoraleGladiators[0];
          dispatch(removeGladiator(escapee.id));
          events.push(`🏃 ${escapee.name} escaped the ludus!`);
          alerts.push({ severity: 'danger', message: `${escapee.name} escaped — starvation drives them to flee!` });
        }
      }

      if (brokeMonths >= 6) {
        dispatch(setGameOver('Your ludus has gone bankrupt. Unable to pay debts, feed gladiators, or maintain operations for 6 consecutive months, the Roman authorities have seized your property and disbanded your school.'));
        alerts.push({ severity: 'danger', message: 'GAME OVER: Your ludus has been seized for unpaid debts!' });
      } else if (brokeMonths >= 4) {
        alerts.push({ severity: 'danger', message: `⚠️ CRITICAL: ${brokeMonths}/6 months of bankruptcy! Sell gladiators or take loans NOW!` });
      } else if (brokeMonths >= 2) {
        alerts.push({ severity: 'warning', message: `${brokeMonths}/6 months in debt. Staff and gladiators are suffering.` });
      }
    } else {
      if (brokeMonthsRef.current > 0) {
        dispatch(resetBrokeMonths());
        events.push(`💰 Finances stabilized — no longer in debt.`);
      }
    }

    // Create month report for the month that just completed (BEFORE advancing)
    dispatch(setMonthReport({
      year: currentYear,
      month: currentMonth,
      income,
      expenses,
      netGold: finalTotalIncome - actualTotalSpent,
      events,
      alerts,
    }));
    
    // THEN advance to next month
    dispatch(advanceMonth());
    
    setProcessingMonth(false);
  }, [dispatch, currentYear, currentMonth, totalDailyWages, foodCosts, ludusFame, gold, roster, employees, buildings, resources, activeQuests, ownedMerchandise, activeSponsorships, factionFavors, protectionLevel, consecutiveBrokeMonths]);

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
    <MainLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Welcome Header */}
        <motion.div variants={itemVariants} className="flex justify-between items-start">
          <div>
            <h1 className="font-roman text-3xl text-roman-gold-500 mb-2">
              Hoş geldin, {name}
            </h1>
            <p className="text-roman-marble-400">
              {getMonthName(currentMonth)}, {currentYear} MS - {ludusName}
            </p>
          </div>
          <div className="text-right">
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{currentSeason.icon}</span>
                <span className="font-roman text-xl text-roman-gold-400">{currentSeason.name}</span>
              </div>
              <span className="text-sm text-roman-marble-500 italic">{currentSeason.latin}</span>
            </div>
          </div>
        </motion.div>

        {/* Rebellion Warning */}
        {rebellionWarning && (
          <motion.div
            variants={itemVariants}
            className="bg-roman-crimson-600/20 border-2 border-roman-crimson-600 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <div className="font-roman text-roman-crimson-400">İsyan Uyarısı!</div>
                <div className="text-roman-marble-300 text-sm">
                  Gladyatörlerin son derece huzursuz. Koşulları hemen iyileştir yoksa isyan riski doğar!
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Stats Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4">
          <Card className="text-center">
            <CardContent>
              <div className="text-3xl mb-1">🪙</div>
              <div className="font-roman text-2xl text-roman-gold-400">{gold}</div>
              <div className="text-xs text-roman-marble-500 uppercase">Altın</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent>
              <div className="text-3xl mb-1">⚔️</div>
              <div className="font-roman text-2xl text-roman-marble-200">{roster.length}</div>
              <div className="text-xs text-roman-marble-500 uppercase">Gladyatörler</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent>
              <div className="text-3xl mb-1">🏗️</div>
              <div className="font-roman text-2xl text-roman-marble-200">{buildings.length}</div>
              <div className="text-xs text-roman-marble-500 uppercase">Binalar</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent>
              <div className="text-3xl mb-1">⭐</div>
              <div className="font-roman text-2xl text-roman-marble-200">{ludusFame}</div>
              <div className="text-xs text-roman-marble-500 uppercase">Şöhret</div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-2 gap-6">
          {/* Ludus Fame Progress */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Ludus İtibarı</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressBar
                  value={ludusFame}
                  max={1000}
                  variant="fame"
                  size="lg"
                  showLabel
                  label="Şöhret"
                />
                <div className="mt-4 text-sm text-roman-marble-400">
                  {ludusFame < 100 && 'Bilinmeyen Okul - Sadece çukur dövüşleri açık'}
                  {ludusFame >= 100 && ludusFame < 300 && 'Yerel Tanınırlık - Eyalet Munera açıldı'}
                  {ludusFame >= 300 && ludusFame < 500 && 'Bölgesel Şöhret - Daha iyi pazar erişimi'}
                  {ludusFame >= 500 && ludusFame < 750 && 'Ünlü Okul - Elit seçenekler açık'}
                  {ludusFame >= 750 && "Efsanevi Ludus - İmparator Oyunları daveti"}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Resources */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Kaynaklar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl mb-1">🌾</div>
                    <div className="font-bold text-roman-marble-200">{resources.grain}</div>
                    <div className="text-xs text-roman-marble-500">Tahıl</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">💧</div>
                    <div className="font-bold text-roman-marble-200">{resources.water}</div>
                    <div className="text-xs text-roman-marble-500">Su</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">🍷</div>
                    <div className="font-bold text-roman-marble-200">{resources.wine}</div>
                    <div className="text-xs text-roman-marble-500">Şarap</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Daily Summary */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Günlük Özet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-roman-marble-400">Personel Ücretleri</span>
                    <span className="text-roman-crimson-400">-{totalDailyWages}g</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-roman-marble-400">Yemek Masrafları</span>
                    <span className="text-roman-crimson-400">-{roster.length * 2}g</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-roman-marble-400">Personel</span>
                    <span className="text-roman-marble-200">{employees.length}</span>
                  </div>
                  <div className="divider-roman my-2" />
                  <div className="flex justify-between items-center font-roman">
                    <span className="text-roman-gold-400">Tahmini Günlük Masraf</span>
                    <span className="text-roman-crimson-400">-{totalDailyWages + roster.length * 2}g</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Loans */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>💰 Aktif Krediler</CardTitle>
              </CardHeader>
              <CardContent>
                {activeLoans.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="text-roman-marble-500 text-sm mb-3">Aktif kredi yok</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowLoansModal(true)}
                    >
                      Kredi Çek
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeLoans.map(loan => {
                      const remaining = loan.durationMonths - loan.monthsPaid;
                      const loanType = LOAN_TYPES[loan.type];
                      return (
                        <div key={loan.id} className="bg-roman-marble-800 p-3 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-roman text-sm text-roman-marble-200">
                                {loanType.name}
                              </div>
                              <div className="text-xs text-roman-marble-500">
                                {loan.principal}g @ %{loan.interestRate} faiz
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-roman-gold-400">
                                {loan.monthlyPayment}g/ay
                              </div>
                              <div className="text-xs text-roman-marble-500">
                                {remaining} ay kaldı
                              </div>
                            </div>
                          </div>
                          {loan.missedPayments > 0 && (
                            <div className="text-xs text-roman-crimson-400">
                              ⚠️ {loan.missedPayments} gecikmiş ödeme
                            </div>
                          )}
                          {(() => {
                            const payoff = calculateEarlyPayoff(loan.monthlyPayment, loan.monthsPaid, loan.durationMonths);
                            const canAfford = gold >= payoff;
                            return (
                              <div className="flex gap-2 mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex-1 text-xs"
                                  disabled={!canAfford}
                                  onClick={() => {
                                    dispatch(spendGold({ amount: payoff, description: `Early payoff: ${loanType.name}`, category: 'loan', day: currentDay }));
                                    dispatch(payOffLoan({ loanId: loan.id, payoffAmount: payoff, currentMonth, currentYear }));
                                  }}
                                >
                                  Erken Kapat ({payoff}g)
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex-1 text-xs"
                                  onClick={() => {
                                    const newType = loan.type === 'short' ? 'medium' : 'long';
                                    dispatch(refinanceLoan({ loanId: loan.id, newType, currentMonth, currentYear }));
                                  }}
                                  disabled={loan.type === 'long'}
                                >
                                  Yeniden Yapılandır
                                </Button>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowLoansModal(true)}
                    >
                      Başka Kredi Çek
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Hızlı Eylemler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => dispatch(setScreen('marketplace'))}
                  >
                    Pazara Git
                  </Button>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => dispatch(setScreen('arena'))}
                  >
                    🏟️ Arenaya Git
                  </Button>
                  <Button
                    variant="gold"
                    className="w-full"
                    onClick={handleEndMonth}
                    disabled={processingMonth}
                  >
                    {processingMonth ? 'İşleniyor...' : 'Sonraki Ay →'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Unrest Meter */}
          {roster.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Gladyatör Huzursuzluğu</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProgressBar
                    value={unrestLevel}
                    max={100}
                    variant={unrestLevel >= 75 ? 'health' : 'default'}
                    size="md"
                  />
                  <div className="flex justify-between mt-2 text-xs text-roman-marble-500">
                    <span>Sakin</span>
                    <span className={clsx(
                      unrestLevel >= 75 ? 'text-roman-crimson-400' :
                      unrestLevel >= 50 ? 'text-orange-400' :
                      'text-health-high'
                    )}>
                      {unrestLevel}%
                    </span>
                    <span>İsyan</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Active Notifications */}
        {roster.length === 0 && (
          <motion.div variants={itemVariants}>
            <Card variant="gold">
              <CardContent className="flex items-center gap-4">
                <span className="text-3xl">💡</span>
                <div>
                  <div className="font-roman text-roman-gold-400">Başlarken</div>
                  <div className="text-roman-marble-300">
                    İlk gladyatörünü toplamak ve mirasını kurmaya başlamak için Pazar'a git!
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Month Processing Overlay */}
        <AnimatePresence>
          {processingMonth && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-roman-marble-900/80 backdrop-blur-sm"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="text-5xl mb-4"
                >
                  ⏳
                </motion.div>
                <div className="font-roman text-xl text-roman-gold-500 mb-2">Ay İlerletiliyor...</div>
                <div className="text-sm text-roman-marble-400">Gelir, gider, eğitim, olaylar işleniyor...</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Month Report Modal */}
        <Modal
          isOpen={showMonthReport}
          onClose={() => dispatch(hideMonthReport())}
          title={`${getMonthName(lastMonthReport?.month || currentMonth)} ${lastMonthReport?.year || currentYear} MS Özeti`}
          size="lg"
        >
          {lastMonthReport && (
            <div className="space-y-6">
              {/* Alerts */}
              {lastMonthReport.alerts.length > 0 && (
                <div className="space-y-2">
                  {lastMonthReport.alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={clsx(
                        'p-3 rounded-lg border',
                        alert.severity === 'danger' && 'bg-roman-crimson-600/20 border-roman-crimson-600',
                        alert.severity === 'warning' && 'bg-orange-600/20 border-orange-600',
                        alert.severity === 'info' && 'bg-blue-600/20 border-blue-600'
                      )}
                    >
                      <span className={clsx(
                        alert.severity === 'danger' && 'text-roman-crimson-400',
                        alert.severity === 'warning' && 'text-orange-400',
                        alert.severity === 'info' && 'text-blue-400'
                      )}>
                        {alert.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Financial Overview Bar */}
              {(() => {
                const totalIncome = lastMonthReport.income.reduce((s, i) => s + i.amount, 0);
                const totalExpenses = lastMonthReport.expenses.reduce((s, i) => s + i.amount, 0);
                const maxVal = Math.max(totalIncome, totalExpenses, 1);
                return (
                  <div className="bg-roman-marble-800 p-4 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center mb-4">
                      <div>
                        <div className="text-xs text-roman-marble-500">Gelir</div>
                        <div className="font-roman text-lg text-health-high">+{totalIncome}g</div>
                      </div>
                      <div>
                        <div className="text-xs text-roman-marble-500">Gider</div>
                        <div className="font-roman text-lg text-roman-crimson-400">-{totalExpenses}g</div>
                      </div>
                      <div>
                        <div className="text-xs text-roman-marble-500">Net</div>
                        <div className={clsx('font-roman text-lg', lastMonthReport.netGold >= 0 ? 'text-roman-gold-400' : 'text-roman-crimson-400')}>
                          {lastMonthReport.netGold >= 0 ? '+' : ''}{lastMonthReport.netGold}g
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-roman-marble-500 w-16">Gelir</span>
                        <div className="flex-1 h-4 bg-roman-marble-700 rounded overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(totalIncome / maxVal) * 100}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-health-high/60 rounded"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-roman-marble-500 w-16">Gider</span>
                        <div className="flex-1 h-4 bg-roman-marble-700 rounded overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(totalExpenses / maxVal) * 100}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-roman-crimson-600/60 rounded"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Financial Details */}
              <div className="grid grid-cols-2 gap-4">
                {/* Income */}
                <div className="bg-roman-marble-800 p-4 rounded-lg">
                  <h4 className="font-roman text-health-high mb-3 flex items-center gap-2">
                    <span>📈</span> Gelir
                  </h4>
                  {lastMonthReport.income.length === 0 ? (
                    <div className="text-roman-marble-500 text-sm">Bu ay gelir yok</div>
                  ) : (
                    <div className="space-y-2">
                      {lastMonthReport.income.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-roman-marble-400">{item.source}</span>
                          <span className="text-health-high">+{item.amount}g</span>
                        </div>
                      ))}
                      <div className="border-t border-roman-marble-700 pt-2 flex justify-between text-sm font-bold">
                        <span className="text-roman-marble-300">Toplam</span>
                        <span className="text-health-high">+{lastMonthReport.income.reduce((s, i) => s + i.amount, 0)}g</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expenses */}
                <div className="bg-roman-marble-800 p-4 rounded-lg">
                  <h4 className="font-roman text-roman-crimson-400 mb-3 flex items-center gap-2">
                    <span>📉</span> Gider
                  </h4>
                  {lastMonthReport.expenses.length === 0 ? (
                    <div className="text-roman-marble-500 text-sm">Bu ay gider yok</div>
                  ) : (
                    <div className="space-y-2">
                      {lastMonthReport.expenses.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-roman-marble-400">{item.source}</span>
                          <span className="text-roman-crimson-400">-{item.amount}g</span>
                        </div>
                      ))}
                      <div className="border-t border-roman-marble-700 pt-2 flex justify-between text-sm font-bold">
                        <span className="text-roman-marble-300">Toplam</span>
                        <span className="text-roman-crimson-400">-{lastMonthReport.expenses.reduce((s, i) => s + i.amount, 0)}g</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Events */}
              {lastMonthReport.events.length > 0 && (
                <div className="bg-roman-marble-800 p-4 rounded-lg">
                  <h4 className="font-roman text-roman-gold-400 mb-3">Olaylar</h4>
                  <div className="space-y-1 text-sm text-roman-marble-300">
                    {lastMonthReport.events.map((event, idx) => (
                      <div key={idx}>• {event}</div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="gold"
                className="w-full"
                onClick={() => dispatch(hideMonthReport())}
              >
                Devam Et
              </Button>
            </div>
          )}
        </Modal>

        {/* Loans Modal */}
        <Modal
          isOpen={showLoansModal}
          onClose={() => {
            setShowLoansModal(false);
            setSelectedLoanType(null);
            setLoanAmount(0);
          }}
          title="💰 Bankacılık Hizmetleri"
        >
          {!selectedLoanType ? (
            <div className="space-y-4">
              <p className="text-roman-marble-400 text-sm mb-4">
                Roma patricileri ve banka evlerinden fon sağla. Kredi vadesini dikkatli seç.
              </p>
              {Object.values(LOAN_TYPES).map(loanType => {
                const monthlyPayment = calculateMonthlyPayment(
                  loanType.maxAmount,
                  loanType.interestRate,
                  loanType.durationMonths
                );
                return (
                  <div
                    key={loanType.id}
                    className="bg-roman-marble-800 p-4 rounded-lg cursor-pointer hover:bg-roman-marble-700 transition-colors border border-roman-marble-700 hover:border-roman-gold-500"
                    onClick={() => {
                      setSelectedLoanType(loanType.id);
                      setLoanAmount(loanType.minAmount);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-roman text-lg text-roman-marble-100 mb-1">
                          {loanType.icon} {loanType.name}
                        </div>
                        <div className="text-sm text-roman-marble-400 mb-2">
                          {loanType.description}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-roman-marble-500">Tutar Aralığı</div>
                        <div className="text-roman-marble-200">
                          {loanType.minAmount}-{loanType.maxAmount}g
                        </div>
                      </div>
                      <div>
                        <div className="text-roman-marble-500">Süre</div>
                        <div className="text-roman-marble-200">
                          {loanType.durationMonths} ay
                        </div>
                      </div>
                      <div>
                        <div className="text-roman-marble-500">Faiz Oranı</div>
                        <div className="text-roman-marble-200">
                          %{loanType.interestRate} toplam
                        </div>
                      </div>
                      <div>
                        <div className="text-roman-marble-500">Aylık Ödeme</div>
                        <div className="text-roman-gold-400">
                          ~{Math.round(monthlyPayment)}g
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-roman-marble-700">
                      <div className="text-xs text-roman-crimson-400">
                        {loanType.missedPaymentPenalty.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-roman-marble-800 p-4 rounded-lg">
                <div className="font-roman text-lg text-roman-marble-100 mb-2">
                  {LOAN_TYPES[selectedLoanType].icon} {LOAN_TYPES[selectedLoanType].name}
                </div>
                <div className="text-sm text-roman-marble-400 mb-4">
                  {LOAN_TYPES[selectedLoanType].description}
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-roman-marble-400 block mb-2">
                      Kredi Tutarı: {loanAmount}g
                    </label>
                    <input
                      type="range"
                      min={LOAN_TYPES[selectedLoanType].minAmount}
                      max={LOAN_TYPES[selectedLoanType].maxAmount}
                      step={50}
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-roman-marble-500 mt-1">
                      <span>{LOAN_TYPES[selectedLoanType].minAmount}g</span>
                      <span>{LOAN_TYPES[selectedLoanType].maxAmount}g</span>
                    </div>
                  </div>

                  <div className="divider-roman" />

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-roman-marble-500">Aylık Ödeme</div>
                      <div className="text-roman-gold-400 font-roman text-lg">
                        {calculateMonthlyPayment(
                          loanAmount,
                          LOAN_TYPES[selectedLoanType].interestRate,
                          LOAN_TYPES[selectedLoanType].durationMonths
                        )}g
                      </div>
                    </div>
                    <div>
                      <div className="text-roman-marble-500">Toplam Geri Ödeme</div>
                      <div className="text-roman-marble-200 font-roman text-lg">
                        {calculateTotalRepayment(
                          loanAmount,
                          LOAN_TYPES[selectedLoanType].interestRate
                        )}g
                      </div>
                    </div>
                    <div>
                      <div className="text-roman-marble-500">Faiz Maliyeti</div>
                      <div className="text-roman-crimson-400">
                        {Math.round(loanAmount * (LOAN_TYPES[selectedLoanType].interestRate / 100))}g
                      </div>
                    </div>
                    <div>
                      <div className="text-roman-marble-500">Süre</div>
                      <div className="text-roman-marble-200">
                        {LOAN_TYPES[selectedLoanType].durationMonths} ay
                      </div>
                    </div>
                  </div>

                  <div className="bg-roman-crimson-900/20 border border-roman-crimson-800 p-3 rounded">
                    <div className="text-xs text-roman-crimson-400">
                      ⚠️ {LOAN_TYPES[selectedLoanType].missedPaymentPenalty.description}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedLoanType(null);
                    setLoanAmount(0);
                  }}
                  className="flex-1"
                >
                  Geri
                </Button>
                <Button
                  variant="gold"
                  onClick={() => {
                    if (selectedLoanType && loanAmount > 0) {
                      const loanType = LOAN_TYPES[selectedLoanType];
                      dispatch(takeLoan({
                        type: selectedLoanType,
                        amount: loanAmount,
                        interestRate: loanType.interestRate,
                        durationMonths: loanType.durationMonths,
                        currentMonth,
                        currentYear,
                      }));
                      dispatch(addGold({
                        amount: loanAmount,
                        description: `Loan: ${loanType.name}`,
                        category: 'Loans',
                        day: (currentYear - 73) * 12 + currentMonth,
                      }));
                      setShowLoansModal(false);
                      setSelectedLoanType(null);
                      setLoanAmount(0);
                    }
                  }}
                  className="flex-1"
                >
                  Krediyi Onayla
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </motion.div>
    </MainLayout>
  );
};
