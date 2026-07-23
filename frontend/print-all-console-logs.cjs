const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.').filter(f => f.startsWith('console_output_') && f.endsWith('.json'));
files.sort((a, b) => {
  const numA = parseInt(a.split('_')[2]);
  const numB = parseInt(b.split('_')[2]);
  return numA - numB;
});

for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`\n================== File: ${file} (Step ${data.step_index}) ==================`);
    
    // Look for console logs inside the subagent actions
    if (data.content && data.content.includes('Findings')) {
      const findings = data.content.split('## Detailed Browser Subagent Actions')[0];
      console.log(findings);
    }
  } catch (e) {
    console.error(e);
  }
}
