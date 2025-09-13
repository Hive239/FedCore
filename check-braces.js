const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/projects/[id]/page.tsx', 'utf8');

let depth = 0;
let lineNum = 1;
let inString = false;
let inComment = false;
let stringChar = null;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  const nextChar = content[i + 1];
  
  if (char === '\n') {
    lineNum++;
    continue;
  }
  
  // Handle comments
  if (!inString && char === '/' && nextChar === '/') {
    // Skip to end of line
    while (i < content.length && content[i] !== '\n') i++;
    lineNum++;
    continue;
  }
  
  if (!inString && char === '/' && nextChar === '*') {
    inComment = true;
    i++;
    continue;
  }
  
  if (inComment && char === '*' && nextChar === '/') {
    inComment = false;
    i++;
    continue;
  }
  
  if (inComment) continue;
  
  // Handle strings
  if (!inString && (char === '"' || char === "'" || char === '`')) {
    inString = true;
    stringChar = char;
    continue;
  }
  
  if (inString && char === stringChar && content[i - 1] !== '\\') {
    inString = false;
    stringChar = null;
    continue;
  }
  
  if (inString) continue;
  
  // Count braces
  if (char === '{') {
    depth++;
  } else if (char === '}') {
    depth--;
    if (depth < 0) {
      console.log(`ERROR: Extra closing brace at line ${lineNum}`);
      // Show context
      const lines = content.split('\n');
      for (let j = Math.max(0, lineNum - 3); j < Math.min(lines.length, lineNum + 2); j++) {
        console.log(`${j + 1}: ${lines[j]}`);
      }
      process.exit(1);
    }
  }
}

if (depth > 0) {
  console.log(`ERROR: Missing ${depth} closing brace(s)`);
  console.log('File ends with unmatched opening braces');
} else if (depth === 0) {
  console.log('Braces are balanced');
} else {
  console.log(`ERROR: ${Math.abs(depth)} extra closing brace(s)`);
}