const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const handleDelete = async (docId: string) => {
    if (!user) return;
    try {
      const updatedDocs = documents.filter(d => d.id !== docId);

      await updateDoc(doc(db, 'birds', bird.id), {
        documents: updatedDocs
      });`;

const replacement = `  const handleDelete = async (docId: string) => {
    if (!user) return;
    try {
      const docToDelete = documents.find(d => d.id === docId);
      const updatedDocs = documents.filter(d => d.id !== docId);

      await updateDoc(doc(db, 'birds', bird.id), {
        documents: updatedDocs
      });
      
      if (docToDelete && docToDelete.url) {
        await deleteStorageFileIfApplicable(docToDelete.url);
      }`;

code = code.replace(target, replacement);

fs.writeFileSync('src/App.tsx', code);
