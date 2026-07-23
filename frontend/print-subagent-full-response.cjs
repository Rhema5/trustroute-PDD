const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/23ca7c28-52ef-4734-8837-5dc8a6898aa1/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

const results = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('Maximum update depth exceeded')) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'BROWSER_SUBAGENT') {
        results.push(obj);
      }
    } catch (e) {
      // ignore
    }
  }
}

fs.writeFileSync('error-trace.json', JSON.stringify(results, null, 2));
console.log('✓ error-trace.json written.');
