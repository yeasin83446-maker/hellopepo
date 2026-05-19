import fs from 'fs';
import path from 'path';

function fixFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // I need to replace '\\$' with '$' and '\\`' with '`' but ONLY if they are incorrectly escaped string template things.
  // Actually, I can just replace all instances of '\\$' with '$' and '\\`' with '`'
  const newContent = content.replace(/\\\$/g, '$').replace(/\\`/g, '`');
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log('Fixed:', filePath);
  }
}

function walkDir(dirP: string) {
  const files = fs.readdirSync(dirP);
  for (const file of files) {
    const fullPath = path.join(dirP, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') walkDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      fixFile(fullPath);
    }
  }
}

walkDir(path.join(process.cwd(), 'src'));
fixFile(path.join(process.cwd(), 'server.ts'));
