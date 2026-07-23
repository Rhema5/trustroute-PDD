const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/23ca7c28-52ef-4734-8837-5dc8a6898aa1/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('Maximum update depth exceeded') || line.includes('ProofsList')) {
    // Let's print the entire step or adjacent logs
    console.log(`\n--- Line ${i} ---`);
    console.log(line.substring(0, 2000));
  }
}
