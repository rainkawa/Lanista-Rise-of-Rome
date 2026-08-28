const fs = require('fs');

const INPUT = 'translation-candidates.txt';
const OUTPUT = 'translation-real-candidates.txt';

const content = fs.readFileSync(INPUT, 'utf8');

const blocks = content.split(/\n(?=TEXT: )/);

const technicalWords = new Set([
  'flex',
  'grid',
  'block',
  'inline',
  'absolute',
  'relative',
  'fixed',
  'sticky',
  'hidden',
  'visible',
  'group',
  'hover',
  'focus',
  'active',
  'disabled',
  'pointer',
  'cursor',
  'transition',
  'transform',
  'animate',
  'duration',
  'ease',
  'items',
  'justify',
  'content',
  'self',
  'space',
  'gap',
  'rounded',
  'border',
  'shadow',
  'ring',
  'outline',
  'overflow',
  'truncate',
  'whitespace',
  'text',
  'font',
  'leading',
  'tracking',
  'min',
  'max',
  'width',
  'height',
  'w',
  'h',
  'p',
  'px',
  'py',
  'pt',
  'pb',
  'pl',
  'pr',
  'm',
  'mx',
  'my',
  'mt',
  'mb',
  'ml',
  'mr',
  'z',
  'top',
  'bottom',
  'left',
  'right',
  'inset',
  'from',
  'via',
  'to',
  'bg',
  'opacity',
  'scale',
  'rotate',
  'translate',
]);

const technicalExact = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'default',
  'main',
  'title',
  'body',
  'div',
  'button',
  'span',
  'input',
  'form',
  'section',
  'header',
  'footer',
]);

function clean(text) {
  return text
    .replace(/^TEXT:\s*/, '')
    .trim();
}

function looksLikeHumanText(text) {
  if (!text) return false;

  // Emoji / sembol ağırlıklı
  const letters = text.match(/[A-Za-zÀ-ÿ]/g);
  if (!letters || letters.length < 2) return false;

  // URL
  if (/^(https?:\/\/|www\.|mailto:)/i.test(text)) return false;

  // CSS / Tailwind
  if (
    /(^|\s)(flex|grid|items|justify|gap|space|text|font|bg|border|rounded|shadow|hover|focus|absolute|relative|fixed|inset|from|via|to)-[\w/.[\]%:-]+/i.test(text)
  ) {
    return false;
  }

  // Teknik değişken / class / identifier
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(text)) {
    if (technicalExact.has(text.toLowerCase())) return false;

    // Büyük ihtimalle teknik isim
    if (
      /^[a-z][a-zA-Z0-9]*$/.test(text) &&
      ![
        'Victory',
        'Defeat',
        'Health',
        'Damage',
        'Armor',
        'Attack',
        'Defense',
        'Strength',
        'Agility',
        'Speed',
        'Morale',
        'Fame',
        'Gold',
        'Food',
        'Training',
        'Arena',
        'Gladiator',
        'Freedom',
        'Politics',
        'Marketplace',
        'Statistics',
        'Settings',
        'Codex',
        'Quests',
      ].includes(text)
    ) {
      return false;
    }
  }

  // Teknik path / token
  if (/[/\\@#{}()[\]<>:=;]/.test(text)) return false;

  // Sadece sayı
  if (/^[\d\s.,+-]+$/.test(text)) return false;

  // Renk / hex
  if (/^#[0-9a-f]{3,8}$/i.test(text)) return false;

  // Tailwind kelimeleri
  const words = text.toLowerCase().split(/\s+/);

  if (
    words.length > 0 &&
    words.every(word => technicalWords.has(word.replace(/[^a-z]/g, '')))
  ) {
    return false;
  }

  // Çoğunlukla teknik karakter
  const technicalChars = (text.match(/[._/\\:@#$%&*+=<>!?-]/g) || []).length;

  if (technicalChars > text.length * 0.35) return false;

  return true;
}

const results = [];

for (const block of blocks) {
  if (!block.startsWith('TEXT: ')) continue;

  const lines = block.split('\n');
  const text = clean(lines[0]);

  if (!looksLikeHumanText(text)) continue;

  results.push(block.trim());
}

let output = '';

output += '=== LANISTA REAL TRANSLATION CANDIDATES ===\n';
output += `Unique candidates after filtering: ${results.length}\n`;
output += `Generated: ${new Date().toISOString()}\n\n`;

output += results.join('\n\n');
output += '\n';

fs.writeFileSync(OUTPUT, output, 'utf8');

console.log('Filtering complete.');
console.log(`Real candidates: ${results.length}`);
console.log(`Output: ${OUTPUT}`);
