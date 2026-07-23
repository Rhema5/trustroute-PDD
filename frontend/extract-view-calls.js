const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/23ca7c28-52ef-4734-8837-5dc8a6898aa1/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('app-store.ts') && line.includes('view_file')) {
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.function && tc.function.name === 'view_file') {
            const args = JSON.parse(tc.function.arguments);
            console.log(`Step ${obj.step_index}: StartLine=${args.StartLine}, EndLine=${args.EndLine}`);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}
