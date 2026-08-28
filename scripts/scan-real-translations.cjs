const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'src');
const OUTPUT = path.join(process.cwd(), 'translation-report.txt');

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const IGNORE = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
]);

const SKIP_EXACT = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'noopener',
  'noreferrer',
]);

const SKIP_PATTERNS = [
  // Tailwind / CSS
  /^(flex|grid|block|inline|absolute|relative|fixed|sticky|hidden|visible|group|hover|focus|active|disabled|pointer|cursor|transition|transform|animate|duration|ease|items|justify|content|self|space|gap|rounded|border|shadow|ring|outline|overflow|truncate|whitespace|text|font|leading|tracking|min|max|width|height|w|h|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|z|top|bottom|left|right|inset|from|via|to|bg|opacity|scale|rotate|translate)-/,
  /^-?(sm|md|lg|xl|2xl):/,
  /^(dark|light):/,
  /^#[0-9a-f]{3,8}$/i,

  // Teknik HTML / React
  /^(className|class|id|key|ref|role|type|name|value|href|target|rel|aria-[\w-]+)$/i,

  // Dosya / URL / kod
  /^(https?:\/\/|www\.|mailto:|data:)/i,
  /^[A-Za-z_$][A-Za-z0-9_$]*$/,
  /^[A-Z_][A-Z0-9_]*$/,

  // Sadece emoji / sembol
  /^[^\p{L}\p{N}]+$/u,

  // Teknik renk / ölçü / token
  /^(rgb|rgba|hsl|hsla)\(/i,
  /^\d+(\.\d+)?(px|rem|em|%|vh|vw|ms|s)?$/i,
  /^[a-f0-9]{6,}$/i,

  // CSS class kombinasyonları
  /\b(flex|grid|items-center|justify-between|gap-\d+|space-[xy]-\d+|cursor-\w+|opacity-\d+|transition-\w*)\b/i,

  // HTML güvenlik attribute'ları
  /\bnoopener\b/i,
  /\bnoreferrer\b/i,
];

function shouldSkip(text) {
  const value = text.trim();

  if (!value) return true;
  if (value.length < 2) return true;

  if (SKIP_EXACT.has(value.toLowerCase())) return true;

  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(value)) return true;
  }

  // Emoji / sembol oranı çok yüksekse
  const letters = (value.match(/\p{L}/gu) || []).length;
  const numbers = (value.match(/\p{N}/gu) || []).length;

  if (letters < 2 && numbers < 1) return true;

  // Tamamen teknik kelimelerden oluşan kısa string
  const words = value.split(/\s+/);

  if (
    words.length >= 1 &&
    words.every(word =>
      /^(flex|grid|items|justify|gap|space|cursor|opacity|ring|rounded|border|shadow|transition|hover|focus|className|noopener|noreferrer)$/i.test(
        word.replace(/[^A-Za-z-]/g, '')
      )
    )
  ) {
    return true;
  }

  return false;
}

function extractStrings(content) {
  const found = [];

  const patterns = [
    // Single quoted
    /'([^'\\]*(?:\\.[^'\\]*)*)'/g,

    // Double quoted
    /"([^"\\]*(?:\\.[^"\\]*)*)"/g,

    // Template literals without interpolation
    /`([^`$\\]*(?:\\.[^`$\\]*)*)`/g,

    // JSX visible text
    />\s*([^<>{}\n]+?)\s*</g,
  ];

  for (const regex of patterns) {
    let match;

    while ((match = regex.exec(content))) {
      const text = match[1]
        .replace(/\\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!shouldSkip(text)) {
        found.push(text);
      }
    }
  }

  return found;
}

const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full);
      continue;
    }

    if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
}

walk(ROOT);

const strings = new Map();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const extracted = extractStrings(content);

  for (const text of extracted) {
    if (!strings.has(text)) {
      strings.set(text, {
        text,
        occurrences: [],
        components: 0,
        data: 0,
      });
    }

    const item = strings.get(text);
    const relative = path.relative(process.cwd(), file);

    item.occurrences.push(relative);

    if (relative.startsWith('src/components/')) {
      item.components++;
    }

    if (relative.startsWith('src/data/')) {
      item.data++;
    }
  }
}

const sorted = [...strings.values()]
  .sort((a, b) => {
    if (b.data !== a.data) return b.data - a.data;
    if (b.components !== a.components) return b.components - a.components;
    return a.text.localeCompare(b.text);
  });

const components = sorted.filter(x => x.components > 0);
const data = sorted.filter(x => x.data > 0);

let output = '';

output += '============================================================\n';
output += ' LANISTA - TRANSLATION REPORT\n';
output += '============================================================\n\n';

output += `Total unique candidates: ${sorted.length}\n`;
output += `Component candidates: ${components.length}\n`;
output += `Data candidates: ${data.length}\n`;
output += `Generated: ${new Date().toISOString()}\n\n`;

output += '============================================================\n';
output += ' COMPONENT / UI STRINGS\n';
output += '============================================================\n\n';

for (const item of components) {
  output += `TEXT: ${item.text}\n`;

  for (const file of [...new Set(item.occurrences)].slice(0, 8)) {
    output += `  - ${file}\n`;
  }

  output += '\n';
}

output += '============================================================\n';
output += ' DATA / GAME CONTENT STRINGS\n';
output += '============================================================\n\n';

for (const item of data) {
  output += `TEXT: ${item.text}\n`;

  for (const file of [...new Set(item.occurrences)].slice(0, 8)) {
    output += `  - ${file}\n`;
  }

  output += '\n';
}

fs.writeFileSync(OUTPUT, output, 'utf8');

console.log('==========================================');
console.log(' LANISTA TRANSLATION SCAN COMPLETE');
console.log('==========================================');
console.log(`Files scanned: ${files.length}`);
console.log(`Unique candidates: ${sorted.length}`);
console.log(`UI candidates: ${components.length}`);
console.log(`Data candidates: ${data.length}`);
console.log(`Report: ${OUTPUT}`);
console.log('==========================================');
