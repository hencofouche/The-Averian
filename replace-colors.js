import fs from 'fs';
import path from 'path';

const filePaths = [
  'src/App.tsx',
  'src/components/ui/card.tsx',
  'src/components/ui/badge.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/input.tsx',
  'src/components/ui/select.tsx',
  'src/components/ui/modal.tsx'
];

for (const filePath of filePaths) {
  const fullPath = path.resolve(filePath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    content = content.replace(/text-black-(\d+)/g, (match, num) => {
      const n = parseInt(num, 10);
      if (n === 800) return 'text-black-500';
      if (n === 700) return 'text-black-400';
      if (n === 600) return 'text-black-400';
      if (n === 500) return 'text-black-300';
      if (n === 400) return 'text-black-200';
      if (n === 300) return 'text-black-100';
      return match;
    });

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}
