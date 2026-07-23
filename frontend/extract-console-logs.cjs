const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/23ca7c28-52ef-4734-8837-5dc8a6898aa1/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

let index = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('capture_browser_console_logs')) {
    try {
      const obj = JSON.parse(line);
      // Look for the TOOL_RESPONSE (usually has output or result)
      console.log(`Match at line ${i}, step ${obj.step_index}`);
      fs.writeFileSync(`console_output_${index++}.json`, JSON.stringify(obj, null, 2));
    } catch (e) {
      // ignore
    }
  }
}
console.log('✓ Done searching.');
