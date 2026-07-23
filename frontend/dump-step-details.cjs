const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/58a5913b-66de-4553-963f-28778be50ffd/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

const stepsToDump = [136, 172, 180, 182, 184];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.trim() === '') continue;
  try {
    const obj = JSON.parse(line);
    if (stepsToDump.includes(obj.step_index) && obj.type === 'PLANNER_RESPONSE') {
      console.log(`Step ${obj.step_index} (${obj.type}):`);
      if (obj.tool_calls) {
        obj.tool_calls.forEach((tc, idx) => {
          console.log(`  Tool ${idx}: ${tc.name}`);
          if (tc.args) {
            console.log('    TargetFile:', tc.args.TargetFile);
            if (tc.args.CodeContent) {
              console.log('    CodeContent length:', tc.args.CodeContent.length);
              fs.writeFileSync(`step-${obj.step_index}-tc-${idx}-code.ts`, tc.args.CodeContent);
            }
            if (tc.args.ReplacementContent) {
              console.log('    ReplacementContent length:', tc.args.ReplacementContent.length);
            }
            if (tc.args.ReplacementChunks) {
              console.log('    ReplacementChunks count:', tc.args.ReplacementChunks.length);
            }
          }
        });
      }
    }
  } catch (e) {
    console.error(e);
  }
}
