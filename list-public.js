import fs from 'fs';
const files = fs.readdirSync('public');
for (const f of files) {
  console.log(f, fs.statSync('public/' + f).size);
}
