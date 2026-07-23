const fs = require('fs');
const lines = fs.readFileSync('reconstructed-app-store-precise.ts', 'utf8').split('\n');
console.log('Total Lines:', lines.length);
console.log('--- Last 30 Lines ---');
console.log(lines.slice(-30).join('\n'));
