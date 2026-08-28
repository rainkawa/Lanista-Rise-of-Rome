import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '@app/hooks';
import { setScreen } from '@features/game/gameSlice';
import { 
  Card, 
  CardContent, 
  Button, 
  Badge,
} from '@components/ui';
import { 
  LORE_CATEGORIES, 
  getLoreByCategory, 
  isLoreUnlocked,
  type LoreCategory,
  type LoreEntry,
} from '@data/lore';
import { clsx } from 'clsx';

// Markdown-like rendering for lore content
const LoreContent: React.FC<{ content: string }> = ({ content }) => {
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    lines.forEach((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`} className="bg-roman-marble-800 p-4 rounded-lg overflow-x-auto text-sm my-4">
              <code className="text-roman-gold-300">{codeContent.join('\n')}</code>
            </pre>
          );
          codeContent = [];
        }
        inCodeBlock = !inCodeBlock;
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      // Tables
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        // Skip separator row
        if (!line.includes('---')) {
          const cells = line.split('|').filter(cell => cell.trim() !== '');
          tableRows.push(cells.map(c => c.trim()));
        }
        return;
      } else if (inTable) {
        // End of table
        elements.push(
          <div key={`table-${index}`} className="overflow-x-auto my-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-roman-gold-600">
                  {tableRows[0]?.map((cell, i) => (
                    <th key={i} className="text-left p-2 text-roman-gold-400 font-roman">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-roman-marble-700">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="p-2 text-roman-marble-300">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="font-roman text-3xl text-roman-gold-400 mb-4 mt-6">
            {line.substring(2)}
          </h1>
        );
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="font-roman text-2xl text-roman-gold-500 mb-3 mt-5">
            {line.substring(3)}
          </h2>
        );
        return;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="font-roman text-xl text-roman-marble-200 mb-2 mt-4">
            {line.substring(4)}
          </h3>
        );
        return;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={index} className="border-l-4 border-roman-gold-600 pl-4 py-2 my-4 italic text-roman-marble-400">
            {line.substring(2)}
          </blockquote>
        );
        return;
      }

      // List items
      if (line.startsWith('- ')) {
        elements.push(
          <li key={index} className="ml-4 text-roman-marble-300 mb-1">
            {renderInlineFormatting(line.substring(2))}
          </li>
        );
        return;
      }

      // Checkbox items
      if (line.startsWith('- [ ] ')) {
        elements.push(
          <li key={index} className="ml-4 text-roman-marble-300 mb-1 flex items-center gap-2">
            <span className="w-4 h-4 border border-roman-marble-500 rounded" />
            {line.substring(6)}
          </li>
        );
        return;
      }
      if (line.startsWith('- [x] ')) {
        elements.push(
          <li key={index} className="ml-4 text-roman-marble-300 mb-1 flex items-center gap-2">
            <span className="w-4 h-4 bg-roman-gold-600 rounded flex items-center justify-center text-xs">✓</span>
            {line.substring(6)}
          </li>
        );
        return;
      }

      // Empty lines
      if (line.trim() === '') {
        elements.push(<div key={index} className="h-2" />);
        return;
      }

      // Regular paragraphs
      elements.push(
        <p key={index} className="text-roman-marble-300 mb-3 leading-relaxed">
          {renderInlineFormatting(line)}
        </p>
      );
    });

    return elements;
  };

  const renderInlineFormatting = (text: string): React.ReactNode => {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-roman-marble-100 font-semibold">$1</strong>');
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    // Code
    text = text.replace(/`(.*?)`/g, '<code class="bg-roman-marble-700 px-1 rounded text-roman-gold-300 text-sm">$1</code>');

    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  return <div className="lore-content">{renderContent(content)}</div>;
};

export const CodexScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  
  const gameState = useAppSelector(state => state.game);
  const fameState = useAppSelector(state => state.fame);
  const gladiatorsState = useAppSelector(state => state.gladiators);
  const ludusState = useAppSelector(state => state.ludus);
  const questsState = useAppSelector(state => state.quests);

  const [selectedCategory, setSelectedCategory] = useState<LoreCategory>('history');
  const [selectedEntry, setSelectedEntry] = useState<LoreEntry | null>(null);

  // Build game state for unlock checks
  const unlockState = useMemo(() => ({
    ludusFame: fameState?.ludusFame || 0,
    completedQuests: questsState?.completedQuestIds || [],
    buildings: ludusState?.buildings?.map(b => b.type) || [],
    gladiatorCount: gladiatorsState?.roster?.length || 0,
    currentDay: gameState?.currentDay || 1,
  }), [fameState, questsState, ludusState, gladiatorsState, gameState]);

  // Get entries for selected category with unlock status
  const categoryEntries = useMemo(() => {
    return getLoreByCategory(selectedCategory).map(entry => ({
      ...entry,
      unlocked: isLoreUnlocked(entry, unlockState),
    }));
  }, [selectedCategory, unlockState]);

  const unlockedCount = categoryEntries.filter(e => e.unlocked).length;
  const totalCount = categoryEntries.length;

  const gameMode = useAppSelector(state => state.game?.gameMode || 'lanista');

  const handleBack = () => {
    if (selectedEntry) {
      setSelectedEntry(null);
    } else {
      dispatch(setScreen(gameMode === 'gladiator' ? 'gladiatorDashboard' : 'dashboard'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-roman-marble-900 via-roman-marble-800 to-roman-marble-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-roman-marble-900/95 backdrop-blur border-b-2 border-roman-gold-700 px-4 py-3">
        <div className="mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack}>
            ← {selectedEntry ? 'Listeye Dön' : 'Geri'}
          </Button>
          <h1 className="font-roman text-2xl sm:text-3xl text-roman-gold-500">
            📜 Codex
          </h1>
          <div className="text-roman-marble-400 text-sm">
            {unlockedCount}/{totalCount} kayıt
          </div>
        </div>
      </header>

      <div className="mx-auto p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {selectedEntry ? (
            // Entry Detail View
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-roman-marble-850">
                <CardContent className="p-6 sm:p-8">
                  <LoreContent content={selectedEntry.content} />
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            // Category and Entry List View
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2">
                {LORE_CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                      'font-roman text-sm uppercase tracking-wide',
                      selectedCategory === category.id
                        ? 'bg-roman-gold-600 text-roman-marble-900'
                        : 'bg-roman-marble-800 text-roman-marble-400 hover:bg-roman-marble-700 hover:text-roman-marble-200'
                    )}
                  >
                    <span>{category.icon}</span>
                    <span className="hidden sm:inline">{category.name}</span>
                  </button>
                ))}
              </div>

              {/* Category Description */}
              <Card>
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {LORE_CATEGORIES.find(c => c.id === selectedCategory)?.icon}
                    </span>
                    <div>
                      <h2 className="font-roman text-xl text-roman-gold-400">
                        {LORE_CATEGORIES.find(c => c.id === selectedCategory)?.name}
                      </h2>
                      <p className="text-roman-marble-400 text-sm">
                        {LORE_CATEGORIES.find(c => c.id === selectedCategory)?.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Entry List */}
              <div className="grid gap-3 sm:gap-4">
                {categoryEntries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card
                      className={clsx(
                        'transition-all cursor-pointer',
                        entry.unlocked
                          ? 'hover:border-roman-gold-600'
                          : 'opacity-60'
                      )}
                      onClick={() => entry.unlocked && setSelectedEntry(entry)}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {entry.unlocked ? (
                              <span className="text-xl">📖</span>
                            ) : (
                              <span className="text-xl">🔒</span>
                            )}
                            <div>
                              <h3 className={clsx(
                                'font-roman text-lg',
                                entry.unlocked ? 'text-roman-marble-100' : 'text-roman-marble-500'
                              )}>
                                {entry.unlocked ? entry.title : '???'}
                              </h3>
                              {!entry.unlocked && entry.unlockCondition && (
                                <p className="text-roman-marble-500 text-xs">
                                  {getUnlockHint(entry.unlockCondition)}
                                </p>
                              )}
                            </div>
                          </div>
                          {entry.unlocked && (
                            <Badge variant="gold" size="sm">Oku</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Helper to generate unlock hints
function getUnlockHint(condition: NonNullable<LoreEntry['unlockCondition']>): string {
  switch (condition.type) {
    case 'fame':
      return `${condition.value} Ludus Şöhretine ulaş`;
    case 'quest':
      return `Belirli bir görevi tamamla`;
    case 'building':
      return `${condition.value} inşa et`;
    case 'gladiator':
      return `${condition.value} gladyatör topla`;
    case 'day':
      return `${condition.value} gün oyna`;
    default:
      return 'Bilinmeyen gereksinim';
  }
}
