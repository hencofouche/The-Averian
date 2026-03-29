import sharp from 'sharp';
import fs from 'fs';

async function resize() {
  const input = 'public/192.png';
  
  // Create a backup of the original
  fs.copyFileSync(input, 'public/original.png');
  
  await sharp('public/original.png')
    .resize(192, 192)
    .toFile('public/192.png');
    
  await sharp('public/original.png')
    .resize(512, 512)
    .toFile('public/512.png');
    
  console.log('Resized successfully');
}

resize().catch(console.error);
