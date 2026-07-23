const fs = require('fs');
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/58a5913b-66de-4553-963f-28778be50ffd/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

const views = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.trim() === '') continue;
  if (line.includes('app-store.ts') && line.includes('VIEW_FILE')) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'VIEW_FILE' && obj.status === 'DONE') {
        const content = obj.content;
        let StartLine = 1;
        let EndLine = 800;
        
        // Let's search backwards for the matching tool call
        for (let j = i - 1; j >= 0; j--) {
          if (lines[j].includes('tool_calls')) {
            try {
              const callObj = JSON.parse(lines[j]);
              if (callObj.tool_calls) {
                const tc = callObj.tool_calls.find(c => c.name === 'view_file');
                if (tc && tc.args) {
                  if (tc.args.AbsolutePath && tc.args.AbsolutePath.includes('app-store.ts')) {
                    StartLine = tc.args.StartLine || 1;
                    EndLine = tc.args.EndLine || 800;
                    break;
                  }
                }
              }
            } catch (innerErr) {
              // ignore parse errors on backwards search
            }
          }
        }

        // Clean content: remove "Showing lines X to Y" and line numbers
        const cleanContent = content
          .split('\n')
          .filter(l => !l.startsWith('File Path:') && !l.startsWith('Total Lines:') && !l.startsWith('Total Bytes:') && !l.startsWith('Showing lines') && !l.includes('shows the entire, complete file contents'))
          .map(l => {
            const match = l.match(/^\d+:\s?(.*)$/);
            return match ? match[1] : l;
          })
          .join('\n');

        views.push({ StartLine, EndLine, content: cleanContent });
      }
    } catch (e) {
      console.error('Error on line ' + i, e);
    }
  }
}

// Sort by StartLine
views.sort((a, b) => a.StartLine - b.StartLine);

console.log(`Found ${views.length} views:`);
views.forEach(v => console.log(`StartLine: ${v.StartLine}, EndLine: ${v.EndLine}`));

// Reconstruct file
const lineMap = {};
views.forEach(v => {
  const fileLines = v.content.split('\n');
  fileLines.forEach((lineText, idx) => {
    const lineNum = v.StartLine + idx;
    lineMap[lineNum] = lineText;
  });
});

const maxLine = Math.max(...Object.keys(lineMap).map(Number));
const resultLines = [];
for (let i = 1; i <= maxLine; i++) {
  resultLines.push(lineMap[i] || '');
}

const finalContent = resultLines.join('\n');
fs.writeFileSync('reconstructed-app-store.ts', finalContent);
console.log(`✓ Reconstructed file written. Max Line: ${maxLine}, total characters: ${finalContent.length}`);
