const fs = require('fs');
const data = JSON.parse(fs.readFileSync('console_output_11.json', 'utf8'));

// Search through the step logs inside data
const actions = data.content;
const lines = actions.split('\n');
for (const line of lines) {
  if (line.includes('Maximum update depth exceeded') || line.includes('at ') || line.includes('Error')) {
    console.log(line);
  }
}
