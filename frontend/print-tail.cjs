const fs = require('fs');
const lines = fs.readFileSync('reconstructed-app-store.ts', 'utf8').split('\n');
console.log('Total Lines:', lines.length);
console.log('--- Last 100 Lines ---');
console.log(lines.slice(-100).join('\n'));
