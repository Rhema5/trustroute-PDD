const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/58a5913b-66de-4553-963f-28778be50ffd/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('app-store.ts') && (line.includes('replace_file_content') || line.includes('write_to_file') || line.includes('multi_replace_file_content'))) {
    try {
      const obj = JSON.parse(line);
      console.log(`Step ${obj.step_index} (${obj.type}): line length = ${line.length}`);
      if (obj.tool_calls) {
        obj.tool_calls.forEach(tc => {
          console.log(`  Tool Name: ${tc.name}`);
          if (tc.args) {
            console.log('    Args:', JSON.stringify({ ...tc.args, ReplacementContent: tc.args.ReplacementContent ? tc.args.ReplacementContent.substring(0, 100) + '...' : undefined, CodeContent: tc.args.CodeContent ? tc.args.CodeContent.substring(0, 100) + '...' : undefined }));
          }
        });
      }
    } catch (e) {
      // ignore
    }
  }
}
