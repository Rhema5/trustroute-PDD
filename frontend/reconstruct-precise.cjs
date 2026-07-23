const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/58a5913b-66de-4553-963f-28778be50ffd/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

const lineMap = {};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.trim() === '') continue;
  if (line.includes('app-store.ts') && line.includes('VIEW_FILE')) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'VIEW_FILE' && obj.status === 'DONE') {
        const content = obj.content;
        const fileLines = content.split('\n');
        
        fileLines.forEach(l => {
          // Match lines starting with a number and colon (e.g., "779: collectCodPayment...")
          const match = l.match(/^(\d+):(.*)$/);
          if (match) {
            const lineNum = parseInt(match[1], 10);
            const lineText = match[2]; // keep leading space if any
            lineMap[lineNum] = lineText;
          }
        });
      }
    } catch (e) {
      console.error('Error parsing line ' + i, e);
    }
  }
}

const lineNumbers = Object.keys(lineMap).map(Number);
if (lineNumbers.length === 0) {
  console.log('No lines found!');
  process.exit(1);
}

const minLine = Math.min(...lineNumbers);
const maxLine = Math.max(...lineNumbers);
console.log(`Parsed lines range: ${minLine} to ${maxLine}. Total unique lines: ${lineNumbers.length}`);

const resultLines = [];
for (let i = 1; i <= maxLine; i++) {
  // If line was not viewed, fallback to empty string (or we can see if it was in HEAD version)
  resultLines.push(lineMap[i] !== undefined ? lineMap[i] : '');
}

const finalContent = resultLines.join('\n');
fs.writeFileSync('reconstructed-app-store-precise.ts', finalContent);
console.log(`✓ Reconstructed file written to reconstructed-app-store-precise.ts`);
