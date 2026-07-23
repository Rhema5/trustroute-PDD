const { execSync } = require('child_process');
const output = execSync('git log --all --name-only --oneline').toString();
const lines = output.split('\n');

const commits = {};
let currentCommit = '';

for (const line of lines) {
  if (line.match(/^[0-9a-f]{7}/)) {
    currentCommit = line;
  } else if (line.includes('app-store.ts')) {
    if (!commits[currentCommit]) commits[currentCommit] = [];
    commits[currentCommit].push(line);
  }
}

console.log('Commits containing app-store.ts:');
console.log(JSON.stringify(commits, null, 2));
