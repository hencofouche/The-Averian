import sharp from 'sharp';

async function convert() {
  await sharp('public/192.png').png().toFile('public/192-true.png');
  await sharp('public/512.png').png().toFile('public/512-true.png');
  console.log('Converted successfully');
}

convert().catch(console.error);
