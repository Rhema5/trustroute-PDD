const fs = require('fs');

const lineMap = {};

function parseFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  lines.forEach(l => {
    const match = l.match(/^(\d+):(.*)$/);
    if (match) {
      const lineNum = parseInt(match[1], 10);
      const lineText = match[2];
      lineMap[lineNum] = lineText;
    }
  });
}

parseFile('step-35-content.txt');
parseFile('step-37-content.txt');

const lineNumbers = Object.keys(lineMap).map(Number);
const maxLine = Math.max(...lineNumbers);
console.log(`Base file parsed. Line range: 1 to ${maxLine}. Unique lines: ${lineNumbers.length}`);

const resultLines = [];
for (let i = 1; i <= maxLine; i++) {
  resultLines.push(lineMap[i] !== undefined ? lineMap[i] : '');
}

fs.writeFileSync('base-app-store.ts', resultLines.join('\n'));
console.log('✓ base-app-store.ts written.');
