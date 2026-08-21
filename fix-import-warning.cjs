const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `    try {
      const { ref, deleteObject } = await import('firebase/storage');
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch (e) {`;

const replacement = `    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch (e) {`;

code = code.replace(target, replacement);

fs.writeFileSync('src/App.tsx', code);
