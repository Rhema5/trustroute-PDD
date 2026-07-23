const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/23ca7c28-52ef-4734-8837-5dc8a6898aa1/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('owner_test_101@example.com') || line.includes('Maximum update depth exceeded')) {
    try {
      const obj = JSON.parse(line);
      console.log(`Step ${obj.step_index} (${obj.type}):`);
      // print content if type is BROWSER_CONSOLE_LOGS or similar
      if (obj.content) {
        console.log(obj.content.substring(0, 1000));
      }
      if (obj.tool_calls) {
        console.log('Tool calls:', JSON.stringify(obj.tool_calls, null, 2));
      }
      // If it's a tool response
      if (obj.output) {
        console.log('Output:', obj.output.substring(0, 1000));
      }
    } catch (e) {
      // ignore
    }
  }
}
