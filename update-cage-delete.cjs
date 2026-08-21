const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                              onConfirm: async () => {
                                try { await deleteDoc(doc(db, 'cages', cage.id)); }
                                catch (e) { handleFirestoreError(e, OperationType.DELETE, 'cages'); }
                              }`;

const replacement = `                              onConfirm: async () => {
                                try { 
                                  await deleteDoc(doc(db, 'cages', cage.id)); 
                                  if (cage.imageUrl) {
                                    const imageRef = ref(storage, cage.imageUrl);
                                    await deleteObject(imageRef).catch(e => console.error('Failed to delete cage image:', e));
                                  }
                                }
                                catch (e) { handleFirestoreError(e, OperationType.DELETE, 'cages'); }
                              }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
