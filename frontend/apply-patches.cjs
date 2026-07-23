const fs = require('fs');

let content = fs.readFileSync('base-app-store.ts', 'utf8');

function replaceWhitespaceInsensitive(source, target, replacement) {
  // Normalize line endings to LF first for both
  const normSource = source.replace(/\r\n/g, '\n');
  const normTarget = target.replace(/\r\n/g, '\n');
  
  // Escape regex characters except spaces/newlines
  let escaped = '';
  for (let i = 0; i < normTarget.length; i++) {
    const char = normTarget[i];
    if (char.match(/\s/)) {
      escaped += char;
    } else if ('-\\/\\^$*+?.()|[]{}'.includes(char)) {
      escaped += '\\' + char;
    } else {
      escaped += char;
    }
  }

  // Replace spaces/newlines sequences with \\s* or \\s+
  // To keep matches accurate but flexible, match optional whitespace around punctuation
  // and require at least some whitespace where it exists in target.
  const regexStr = escaped
    .replace(/\s+/g, '\\s+')
    .replace(/\\([\{\}\(\)\[\]\.,;=>:+\-\*])/g, '\\s*\\$1\\s*');
  
  const regex = new RegExp(regexStr);
  if (!regex.test(normSource)) {
    return null;
  }
  return normSource.replace(regex, replacement);
}

function applyChunks(chunks, stepName) {
  console.log(`Applying chunks for ${stepName}...`);
  chunks.forEach((chunk, idx) => {
    const { TargetContent, ReplacementContent } = chunk;
    const res = replaceWhitespaceInsensitive(content, TargetContent, ReplacementContent);
    if (!res) {
      console.error(`ERROR: TargetContent for chunk ${idx} in ${stepName} not found!`);
      console.log('TargetContent:\n' + TargetContent);
      process.exit(1);
    }
    content = res;
    console.log(`  ✓ Chunk ${idx} applied successfully.`);
  });
}

// 1. Step 168
const step168 = JSON.parse(fs.readFileSync('step-168-chunks.json', 'utf8'));
applyChunks(step168, 'Step 168');

// 2. Step 346
const step346 = JSON.parse(fs.readFileSync('step-346-tc-0-multi_replace_file_content.json', 'utf8'));
applyChunks(step346.ReplacementChunks, 'Step 346');

// 3. Step 413
const step413 = JSON.parse(fs.readFileSync('step-413-tc-0-multi_replace_file_content.json', 'utf8'));
applyChunks(step413.ReplacementChunks, 'Step 413');

// Write the normalized result
fs.writeFileSync('src/store/app-store.ts', content);
console.log('✓ Final src/store/app-store.ts written successfully!');
