const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.startsWith('console_output_') && f.endsWith('.json'));
for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('Maximum update depth exceeded')) {
      const obj = JSON.parse(content);
      console.log(`\n================== ${file} ==================`);
      // If the tool execution result contains the logs
      if (obj.output) {
        console.log(obj.output);
      } else {
        console.log(JSON.stringify(obj, null, 2).substring(0, 1000));
      }
    }
  } catch (e) {
    // ignore
  }
}
