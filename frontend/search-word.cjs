const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/58a5913b-66de-4553-963f-28778be50ffd/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('collectCodPayment')) {
    try {
      const obj = JSON.parse(line);
      console.log(`Step ${obj.step_index} (${obj.type}): line length = ${line.length}`);
      // Find where the word is in the line and print context
      const idx = line.indexOf('collectCodPayment');
      console.log(`  Context: ${line.substring(idx - 100, idx + 150)}`);
    } catch (e) {
      // ignore
    }
  }
}
