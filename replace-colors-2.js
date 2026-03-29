import fs from 'fs';
import path from 'path';

const filePaths = [
  'src/App.tsx'
];

for (const filePath of filePaths) {
  const fullPath = path.resolve(filePath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    content = content.replace(/text-black-(\d+)/g, (match, num) => {
      const n = parseInt(num, 10);
      if (n === 500) return 'text-black-300';
      if (n === 400) return 'text-black-200';
      if (n === 300) return 'text-black-100';
      if (n === 200) return 'text-black-50';
      return match;
    });

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}
