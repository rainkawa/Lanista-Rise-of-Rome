const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'src');
const OUTPUT = path.join(process.cwd(), 'translation-candidates.txt');

const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
]);

const EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
]);

const results = new Map();

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full);
      continue;
    }

    const ext = path.extname(entry.name);
    if (!EXTENSIONS.has(ext)) continue;

    scanFile(full);
  }
}

function addString(value, file, line, type) {
  const text = value
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return;

  // Kod, URL, CSS sınıfı, emoji, sayı ve teknik değerleri büyük ölçüde ele.
  if (text.length < 2) return;
  if (/^(https?:\/\/|mailto:)/i.test(text)) return;
  if (/^[A-Za-z0-9_./:@#$%&*+=<>!?-]+$/.test(text)) {
    if (!text.includes(' ')) return;
  }

  // Sadece teknik stringleri ele.
  if (
    /^(px-|text-|bg-|border-|hover:|focus:|from-|to-|via-|grid-|flex-|items-|justify-|rounded-|shadow-|font-|min-|max-|w-|h-|p-|m-|space-|z-|top-|left-|right-|bottom-)/.test(text)
  ) return;

  const key = text;

  if (!results.has(key)) {
    results.set(key, {
      text,
      occurrences: [],
    });
  }

  results.get(key).occurrences.push({
    file: path.relative(process.cwd(), file),
    line,
    type,
  });
}

function scanFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((lineText, index) => {
    const line = index + 1;

    // JSX text: >TEXT<
    const jsxRegex = />([^<>{}]+)</g;
    let match;

    while ((match = jsxRegex.exec(lineText))) {
      addString(match[1], file, line, 'JSX');
    }

    // Single quoted strings
    const singleRegex = /'([^'\\]*(?:\\.[^'\\]*)*)'/g;

    while ((match = singleRegex.exec(lineText))) {
      addString(match[1], file, line, 'single');
    }

    // Double quoted strings
    const doubleRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;

    while ((match = doubleRegex.exec(lineText))) {
      addString(match[1], file, line, 'double');
    }

    // Template literals without ${...}
    const templateRegex = /`([^`$\\]*(?:\\.[^`$\\]*)*)`/g;

    while ((match = templateRegex.exec(lineText))) {
      addString(match[1], file, line, 'template');
    }
  });
}

walk(ROOT);

const sorted = [...results.values()]
  .sort((a, b) => b.occurrences.length - a.occurrences.length);

let output = '';

output += '=== LANISTA TRANSLATION CANDIDATES ===\n';
output += `Unique strings: ${sorted.length}\n`;
output += `Generated: ${new Date().toISOString()}\n\n`;

for (const item of sorted) {
  output += `TEXT: ${item.text}\n`;

  for (const occurrence of item.occurrences.slice(0, 10)) {
    output += `  - ${occurrence.file}:${occurrence.line} [${occurrence.type}]\n`;
  }

  if (item.occurrences.length > 10) {
    output += `  - ... and ${item.occurrences.length - 10} more\n`;
  }

  output += '\n';
}

fs.writeFileSync(OUTPUT, output, 'utf8');

console.log(`Translation scan complete.`);
console.log(`Unique candidates: ${sorted.length}`);
console.log(`Output: ${OUTPUT}`);
