const fs = require('fs');
const lines = fs.readFileSync('reconstructed-app-store.ts', 'utf8').split('\n');
console.log(lines.slice(760, 810).join('\n'));
