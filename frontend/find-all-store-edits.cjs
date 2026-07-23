const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/58a5913b-66de-4553-963f-28778be50ffd/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('app-store.ts')) {
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        obj.tool_calls.forEach((tc, idx) => {
          if (tc.args && tc.args.TargetFile && tc.args.TargetFile.includes('app-store.ts')) {
            console.log(`Step ${obj.step_index} (${tc.name}): length = ${line.length}`);
            fs.writeFileSync(`step-${obj.step_index}-tc-${idx}-${tc.name}.json`, JSON.stringify(tc.args, null, 2));
          }
        });
      }
    } catch (e) {
      // ignore
    }
  }
}
