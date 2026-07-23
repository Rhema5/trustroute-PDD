const fs = require('fs');
const lines = fs.readFileSync('base-app-store.ts', 'utf8').split('\n');
console.log('Total lines of base:', lines.length);
console.log('--- Tail of base ---');
console.log(lines.slice(-150).join('\n'));
