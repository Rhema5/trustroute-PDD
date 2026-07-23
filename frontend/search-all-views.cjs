const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/58a5913b-66de-4553-963f-28778be50ffd/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('view_file')) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'PLANNER_RESPONSE' && obj.tool_calls) {
        obj.tool_calls.forEach((tc, idx) => {
          if (tc.name === 'view_file') {
            console.log(`Step ${obj.step_index}: view_file args = ${JSON.stringify(tc.args)}`);
          }
        });
      }
      if (obj.type === 'VIEW_FILE' && obj.status === 'DONE') {
        console.log(`Step ${obj.step_index}: VIEW_FILE content length = ${obj.content.length}`);
      }
    } catch (e) {
      // ignore
    }
  }
}
