const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/58a5913b-66de-4553-963f-28778be50ffd/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.trim() === '') continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 168) {
      console.log(`Found Step 168: type=${obj.type}, source=${obj.source}`);
      if (obj.tool_calls) {
        obj.tool_calls.forEach((tc, idx) => {
          console.log(`Tool ${idx}: name=${tc.name}`);
          if (tc.args) {
            console.log('Args TargetFile:', tc.args.TargetFile);
            if (tc.args.CodeContent) {
              fs.writeFileSync('step-168-content.ts', tc.args.CodeContent);
              console.log('✓ Wrote CodeContent to step-168-content.ts');
            }
            if (tc.args.ReplacementContent) {
              fs.writeFileSync('step-168-replacement.ts', tc.args.ReplacementContent);
              console.log('✓ Wrote ReplacementContent to step-168-replacement.ts');
            }
            if (tc.args.ReplacementChunks) {
              fs.writeFileSync('step-168-chunks.json', JSON.stringify(tc.args.ReplacementChunks, null, 2));
              console.log('✓ Wrote ReplacementChunks to step-168-chunks.json');
            }
          }
        });
      }
    }
  } catch (e) {
    console.error(e);
  }
}
