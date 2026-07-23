const { execSync } = require('child_process');
const path = require('path');
const repoRoot = path.join(__dirname, '..');

const commits = execSync('git log --all --oneline', { cwd: repoRoot }).toString().split('\n');

for (const c of commits) {
  if (c.trim() === '') continue;
  const hash = c.split(' ')[0];
  try {
    const files = execSync(`git ls-tree -r --name-only ${hash}`, { cwd: repoRoot }).toString().split('\n');
    for (const f of files) {
      if (f.trim() === '') continue;
      if (f.includes('app-store.ts')) {
        const content = execSync(`git show ${hash}:${f}`, { cwd: repoRoot }).toString();
        const linesCount = content.split('\n').length;
        console.log(`Commit ${hash} (${c.substring(8, 40).trim()}): Path=${f}, Lines=${linesCount}`);
      }
    }
  } catch (err) {
    // ignore
  }
}
