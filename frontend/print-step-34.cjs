const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/58a5913b-66de-4553-963f-28778be50ffd/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.trim() === '') continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 34 && obj.type === 'PLANNER_RESPONSE') {
      console.log('Step 34 tool_calls:', JSON.stringify(obj.tool_calls, null, 2));
    }
    if (obj.step_index === 35 && obj.type === 'VIEW_FILE') {
      console.log('Step 35 VIEW_FILE content length:', obj.content.length);
      fs.writeFileSync('step-35-content.txt', obj.content);
      console.log('✓ Wrote Step 35 content to step-35-content.txt');
    }
    if (obj.step_index === 36 && obj.type === 'PLANNER_RESPONSE') {
      console.log('Step 36 tool_calls:', JSON.stringify(obj.tool_calls, null, 2));
    }
    if (obj.step_index === 37 && obj.type === 'VIEW_FILE') {
      console.log('Step 37 VIEW_FILE content length:', obj.content.length);
      fs.writeFileSync('step-37-content.txt', obj.content);
      console.log('✓ Wrote Step 37 content to step-37-content.txt');
    }
  } catch (e) {
    console.error(e);
  }
}
