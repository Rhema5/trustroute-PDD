const fs = require('fs');
const content = fs.readFileSync('base-app-store.ts', 'utf8');

const search = 'reassignOfflineDelivery';
const idx = content.indexOf(search);
if (idx !== -1) {
  console.log(`Found "${search}" at index ${idx}.`);
  console.log('Context:\n' + content.substring(idx - 100, idx + 200));
} else {
  console.log(`"${search}" not found in base-app-store.ts!`);
}
