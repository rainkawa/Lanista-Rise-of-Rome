const fs = require('fs');
const path = require('path');

const root = path.join(process.cwd(), 'src/components');

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);

    if (e.isDirectory()) {
      walk(p);
    } else if (/\.(tsx|ts|jsx|js)$/.test(e.name)) {
      console.log(path.relative(process.cwd(), p));
    }
  }
}

walk(root);
