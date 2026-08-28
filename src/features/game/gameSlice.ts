import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { GameScreen, Difficulty, GameSettings, GameMode } from '@/types';

type TimePhase = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

interface MonthReportEntry {
  source: string;
  amount: number;
}

interface MonthReport {
  year: number;
  month: number;
  income: MonthReportEntry[];
  expenses: MonthReportEntry[];
  netGold: number;
  events: string[];
  alerts: { severity: 'info' | 'warning' | 'danger'; message: string }[];
}

interface ExtendedGameState {
  // Game mode
  gameMode: GameMode;
  
  // Time tracking
  currentYear: number;
  currentMonth: number; // 1-12 (January = 1, December = 12)
  currentPhase: TimePhase;
  currentScreen: GameScreen;
  isPaused: boolean;
  isGameOver: boolean;
  gameOverReason?: string;
  settings: GameSettings;
  
  // Month processing
  lastMonthReport: MonthReport | null;
  showMonthReport: boolean;
  monthProcessing: boolean;
  
  // Unrest
  unrestLevel: number;
  rebellionWarning: boolean;
  
  // Statistics
  totalMonthsPlayed: number;
  totalGoldEarned: number;
  totalGoldSpent: number;
  
  // Financial health
  consecutiveBrokeMonths: number;
  
  // Prestige / New Game+
  prestigeLevel: number;
  hasCompletedGame: boolean;
  
  // Legacy support (for migration)
  currentDay?: number; // Deprecated, kept for save compatibility
}

const initialSettings: GameSettings = {
  difficulty: 'normal',
  autosave: true,
  soundEnabled: true,
  musicEnabled: true,
  sfxVolume: 0.7,
  musicVolume: 0.4,
  tutorialCompleted: false,
};

const initialState: ExtendedGameState = {
  gameMode: 'lanista',
  currentYear: 73, // 73 AD - Year of the Colosseum construction
  currentMonth: 1, // January
  currentPhase: 'morning',
  currentScreen: 'title',
  isPaused: false,
  isGameOver: false,
  gameOverReason: undefined,
  settings: initialSettings,
  lastMonthReport: null,
  showMonthReport: false,
  monthProcessing: false,
  unrestLevel: 0,
  rebellionWarning: false,
  totalMonthsPlayed: 0,
  totalGoldEarned: 0,
  totalGoldSpent: 0,
  consecutiveBrokeMonths: 0,
  prestigeLevel: 0,
  hasCompletedGame: false,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    // Game mode
    setGameMode: (state, action: PayloadAction<GameMode>) => {
      state.gameMode = action.payload;
    },
    
    // Navigation
    setScreen: (state, action: PayloadAction<GameScreen>) => {
      state.currentScreen = action.payload;
    },
    
    // Time management
    advanceMonth: (state) => {
      if (state.currentMonth === 12) {
        state.currentMonth = 1;
        state.currentYear += 1;
      } else {
        state.currentMonth += 1;
      }
      state.totalMonthsPlayed += 1;
      state.currentPhase = 'morning';
    },
    setMonth: (state, action: PayloadAction<{ year: number; month: number }>) => {
      state.currentYear = action.payload.year;
      state.currentMonth = action.payload.month;
    },
    setPhase: (state, action: PayloadAction<TimePhase>) => {
      state.currentPhase = action.payload;
    },
    advancePhase: (state) => {
      const phases: TimePhase[] = ['dawn', 'morning', 'afternoon', 'evening', 'night'];
      const currentIndex = phases.indexOf(state.currentPhase);
      if (currentIndex < phases.length - 1) {
        state.currentPhase = phases[currentIndex + 1];
      }
    },
    
    // Month processing
    startMonthProcessing: (state) => {
      state.monthProcessing = true;
    },
    endMonthProcessing: (state) => {
      state.monthProcessing = false;
    },
    setMonthReport: (state, action: PayloadAction<MonthReport>) => {
      state.lastMonthReport = action.payload;
      state.showMonthReport = true;
    },
    hideMonthReport: (state) => {
      state.showMonthReport = false;
    },
    clearMonthReport: (state) => {
      state.lastMonthReport = null;
      state.showMonthReport = false;
    },
    
    // Legacy support (kept for backward compatibility)
    advanceDay: (state) => {
      // Convert old day advances to month advances
      if (state.currentMonth === 12) {
        state.currentMonth = 1;
        state.currentYear += 1;
      } else {
        state.currentMonth += 1;
      }
      state.totalMonthsPlayed += 1;
      state.currentPhase = 'morning';
    },
    
    // Unrest
    setUnrestLevel: (state, action: PayloadAction<number>) => {
      state.unrestLevel = Math.max(0, Math.min(100, action.payload));
      state.rebellionWarning = state.unrestLevel >= 75;
    },
    adjustUnrest: (state, action: PayloadAction<number>) => {
      state.unrestLevel = Math.max(0, Math.min(100, state.unrestLevel + action.payload));
      state.rebellionWarning = state.unrestLevel >= 75;
    },
    
    // Statistics
    recordGoldEarned: (state, action: PayloadAction<number>) => {
      state.totalGoldEarned += action.payload;
    },
    recordGoldSpent: (state, action: PayloadAction<number>) => {
      state.totalGoldSpent += action.payload;
    },
    
    // Game control
    pauseGame: (state) => {
      state.isPaused = true;
    },
    resumeGame: (state) => {
      state.isPaused = false;
    },
    togglePause: (state) => {
      state.isPaused = !state.isPaused;
    },
    
    // Game over
    setGameOver: (state, action: PayloadAction<string>) => {
      state.isGameOver = true;
      state.gameOverReason = action.payload;
    },
    
    // Settings
    setDifficulty: (state, action: PayloadAction<Difficulty>) => {
      state.settings.difficulty = action.payload;
    },
    toggleAutosave: (state) => {
      state.settings.autosave = !state.settings.autosave;
    },
    toggleSound: (state) => {
      state.settings.soundEnabled = !state.settings.soundEnabled;
    },
    toggleMusic: (state) => {
      state.settings.musicEnabled = !state.settings.musicEnabled;
    },
    setSFXVolume: (state, action: PayloadAction<number>) => {
      state.settings.sfxVolume = Math.max(0, Math.min(1, action.payload));
    },
    setMusicVolume: (state, action: PayloadAction<number>) => {
      state.settings.musicVolume = Math.max(0, Math.min(1, action.payload));
    },
    completeTutorial: (state) => {
      state.settings.tutorialCompleted = true;
    },
    updateSettings: (state, action: PayloadAction<Partial<GameSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    // Financial health
    recordBrokeMonth: (state) => {
      state.consecutiveBrokeMonths = (state.consecutiveBrokeMonths ?? 0) + 1;
    },
    resetBrokeMonths: (state) => {
      state.consecutiveBrokeMonths = 0;
    },
    
    // Prestige
    completeGame: (state) => {
      state.hasCompletedGame = true;
    },
    startNewGamePlus: (state, action: PayloadAction<{ difficulty: Difficulty; gameMode?: GameMode }>) => {
      const prevPrestige = state.prestigeLevel;
      const prevCompleted = state.hasCompletedGame;
      
      state.gameMode = action.payload.gameMode || 'lanista';
      state.currentYear = 73;
      state.currentMonth = 1;
      state.currentPhase = 'morning';
      state.currentScreen = state.gameMode === 'gladiator' ? 'gladiatorDashboard' : 'dashboard';
      state.isPaused = false;
      state.isGameOver = false;
      state.gameOverReason = undefined;
      state.settings.difficulty = action.payload.difficulty;
      state.lastMonthReport = null;
      state.showMonthReport = false;
      state.monthProcessing = false;
      state.unrestLevel = 0;
      state.rebellionWarning = false;
      state.totalMonthsPlayed = 0;
      state.totalGoldEarned = 0;
      state.totalGoldSpent = 0;
      state.consecutiveBrokeMonths = 0;
      state.prestigeLevel = prevCompleted ? prevPrestige + 1 : prevPrestige;
      state.hasCompletedGame = false;
    },
    
    // New game / Reset
    startNewGame: (state, action: PayloadAction<{ difficulty: Difficulty; gameMode?: GameMode }>) => {
      state.gameMode = action.payload.gameMode || 'lanista';
      state.currentYear = 73; // 73 AD
      state.currentMonth = 1; // January
      state.currentPhase = 'morning';
      state.currentScreen = state.gameMode === 'gladiator' ? 'gladiatorDashboard' : 'dashboard';
      state.isPaused = false;
      state.isGameOver = false;
      state.gameOverReason = undefined;
      state.settings.difficulty = action.payload.difficulty;
      state.lastMonthReport = null;
      state.showMonthReport = false;
      state.monthProcessing = false;
      state.unrestLevel = 0;
      state.rebellionWarning = false;
      state.totalMonthsPlayed = 0;
      state.totalGoldEarned = 0;
      state.totalGoldSpent = 0;
      state.consecutiveBrokeMonths = 0;
    },
    resetGame: () => initialState,
  },
});

export const {
  setGameMode,
  setScreen,
  advanceDay, // Kept for backward compatibility
  advanceMonth,
  setMonth,
  setPhase,
  advancePhase,
  startMonthProcessing,
  endMonthProcessing,
  setMonthReport,
  hideMonthReport,
  clearMonthReport,
  setUnrestLevel,
  adjustUnrest,
  recordGoldEarned,
  recordGoldSpent,
  pauseGame,
  resumeGame,
  togglePause,
  setGameOver,
  setDifficulty,
  toggleAutosave,
  toggleSound,
  toggleMusic,
  setSFXVolume,
  setMusicVolume,
  completeTutorial,
  updateSettings,
  recordBrokeMonth,
  resetBrokeMonths,
  completeGame,
  startNewGamePlus,
  startNewGame,
  resetGame,
} = gameSlice.actions;

// Selectors
export const selectGameMode = (state: { game: ExtendedGameState }) => state.game.gameMode;
export const selectCurrentYear = (state: { game: ExtendedGameState }) => state.game.currentYear;
export const selectCurrentMonth = (state: { game: ExtendedGameState }) => state.game.currentMonth;
export const selectCurrentPhase = (state: { game: ExtendedGameState }) => state.game.currentPhase;
export const selectLastMonthReport = (state: { game: ExtendedGameState }) => state.game.lastMonthReport;
export const selectShowMonthReport = (state: { game: ExtendedGameState }) => state.game.showMonthReport;
export const selectUnrestLevel = (state: { game: ExtendedGameState }) => state.game.unrestLevel;
export const selectRebellionWarning = (state: { game: ExtendedGameState }) => state.game.rebellionWarning;

// Helper to get month name
export const getMonthName = (month: number): string => {
  const months = [
    'Januarius', 'Februarius', 'Martius', 'Aprilis', 'Maius', 'Junius',
    'Julius', 'Augustus', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
};

// Helper to format date
export const formatGameDate = (year: number, month: number): string => {
  return `${getMonthName(month)}, ${year} MS`;
};

// Helper to get season from month
export const getSeason = (month: number): { name: string; latin: string; icon: string } => {
  // Spring: March, April, May (3, 4, 5)
  if (month >= 3 && month <= 5) {
    return { name: 'İlkbahar', latin: 'Ver', icon: '🌸' };
  }
  // Summer: June, July, August (6, 7, 8)
  if (month >= 6 && month <= 8) {
    return { name: 'Yaz', latin: 'Aestas', icon: '☀️' };
  }
  // Autumn: September, October, November (9, 10, 11)
  if (month >= 9 && month <= 11) {
    return { name: 'Sonbahar', latin: 'Autumnus', icon: '🍂' };
  }
  // Winter: December, January, February (12, 1, 2)
  return { name: 'Kış', latin: 'Hiems', icon: '❄️' };
};

// Helper to convert year/month to day number (for backward compatibility)
// Useful for systems that still need a numeric "day" value
export const yearMonthToDay = (year: number, month: number): number => {
  // Calculate total months since year 73
  const totalMonths = (year - 73) * 12 + month;
  return totalMonths; // Each "day" is actually a month
};

// Selector for currentDay (backward compatibility)
export const selectCurrentDay = (state: { game: ExtendedGameState }) => {
  return yearMonthToDay(state.game.currentYear, state.game.currentMonth);
};

export default gameSlice.reducer;
