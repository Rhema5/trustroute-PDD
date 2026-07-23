const fs = require('fs');
const content = fs.readFileSync('reconstructed-app-store.ts', 'utf8');

const checkWord = (word) => {
  const count = (content.match(new RegExp(word, 'g')) || []).length;
  console.log(`Word "${word}" appears ${count} times.`);
};

checkWord('collectCodPayment');
checkWord('completeOnlinePayment');
checkWord('subscribeToPayments');
checkWord('offlineQueue');
checkWord('initializeAuth');
console.log('File size:', content.length, 'characters.');
