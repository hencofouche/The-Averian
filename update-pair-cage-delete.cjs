const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// UPDATE CAGE DELETION
const targetCage = `                              onConfirm: async () => {
                                try { 
                                  await deleteDoc(doc(db, 'cages', cage.id)); 
                                  if (cage.imageUrl) {
                                    const imageRef = ref(storage, cage.imageUrl);
                                    await deleteObject(imageRef).catch(e => console.error('Failed to delete cage image:', e));
                                  }
                                }
                                catch (e) { handleFirestoreError(e, OperationType.DELETE, 'cages'); }
                              }`;

const replacementCage = `                              onConfirm: async () => {
                                try { 
                                  await deleteDoc(doc(db, 'cages', cage.id)); 
                                  if (cage.imageUrls && cage.imageUrls.length > 0) {
                                    for (const url of cage.imageUrls) {
                                      await deleteObject(ref(storage, url)).catch(e => console.error('Failed to delete cage image:', e));
                                    }
                                  } else if (cage.imageUrl) {
                                    await deleteObject(ref(storage, cage.imageUrl)).catch(e => console.error('Failed to delete cage image:', e));
                                  }
                                }
                                catch (e) { handleFirestoreError(e, OperationType.DELETE, 'cages'); }
                              }`;

code = code.replace(targetCage, replacementCage);

// UPDATE PAIR DELETION
const targetPair = `                                  await batch.commit();
                                  toast.success('Pair deleted and mate links removed');`;

const replacementPair = `                                  await batch.commit();
                                  
                                  if (pair.imageUrls && pair.imageUrls.length > 0) {
                                    for (const url of pair.imageUrls) {
                                      await deleteObject(ref(storage, url)).catch(e => console.error('Failed to delete pair image:', e));
                                    }
                                  }
                                  
                                  toast.success('Pair deleted and mate links removed');`;

code = code.replace(targetPair, replacementPair);

// What about BreedingRecords? Let's check if they have images.
fs.writeFileSync('src/App.tsx', code);
