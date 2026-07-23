const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/58a5913b-66de-4553-963f-28778be50ffd/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('app-store.ts') && (line.includes('write_to_file') || line.includes('replace_file_content') || line.includes('multi_replace_file_content'))) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'PLANNER_RESPONSE' && obj.tool_calls) {
        obj.tool_calls.forEach((tc, idx) => {
          if (tc.args && tc.args.TargetFile && tc.args.TargetFile.includes('app-store.ts')) {
            console.log(`Step ${obj.step_index} Tool Call ${idx} (${tc.name}):`);
            if (tc.args.CodeContent) {
              console.log('--- CodeContent ---');
              console.log(tc.args.CodeContent);
              console.log('-------------------');
            }
            if (tc.args.ReplacementContent) {
              console.log('--- ReplacementContent ---');
              console.log(tc.args.ReplacementContent);
              console.log('-------------------');
            }
            if (tc.args.ReplacementChunks) {
              console.log('--- ReplacementChunks ---');
              console.log(JSON.stringify(tc.args.ReplacementChunks, null, 2));
              console.log('-------------------');
            }
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
}
