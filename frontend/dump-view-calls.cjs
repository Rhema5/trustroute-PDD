const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/58a5913b-66de-4553-963f-28778be50ffd/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.trim() === '') continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 267 || obj.step_index === 269 || obj.step_index === 271 || obj.step_index === 411) {
      if (obj.type === 'PLANNER_RESPONSE') {
        console.log(`Step ${obj.step_index} Tool Calls:`, JSON.stringify(obj.tool_calls, null, 2));
      }
    }
  } catch (e) {
    // ignore
  }
}
