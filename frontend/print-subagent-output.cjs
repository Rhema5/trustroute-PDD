const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/23ca7c28-52ef-4734-8837-5dc8a6898aa1/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.trim() === '') continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 610) {
      console.log('--- Step 610 Output ---');
      console.log(obj.output);
      console.log('-----------------------');
    }
  } catch (e) {
    // ignore
  }
}
