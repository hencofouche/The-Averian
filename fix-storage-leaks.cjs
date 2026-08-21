const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add the helper function
const helperFunc = `
const deleteStorageFileIfApplicable = async (url: string) => {
  if (!url) return;
  if (url.startsWith('https://firebasestorage.googleapis.com/')) {
    try {
      const { ref, deleteObject } = await import('firebase/storage');
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch (e) {
      console.error('Failed to delete storage file:', e);
    }
  }
};
`;

code = code.replace(
  `const compressAndUploadImage = async (file: File, path: string): Promise<string> => {`,
  helperFunc + `\nconst compressAndUploadImage = async (file: File, path: string): Promise<string> => {`
);

// 2. Update Bird delete logic
const targetBird = `                                  // Clean up images from storage
                                  try {
                                    if (bird.imageUrls && bird.imageUrls.length > 0) {
                                      for (const url of bird.imageUrls) {
                                        const imageRef = ref(storage, url);
                                        await deleteObject(imageRef);
                                      }
                                    } else if (bird.imageUrl) {
                                      const imageRef = ref(storage, bird.imageUrl);
                                      await deleteObject(imageRef);
                                    }
                                  } catch (imgError) {
                                    console.error('Failed to delete image from storage:', imgError);
                                  }`;

const replacementBird = `                                  // Clean up images from storage
                                  if (bird.imageUrls && bird.imageUrls.length > 0) {
                                    for (const url of bird.imageUrls) {
                                      await deleteStorageFileIfApplicable(url);
                                    }
                                  } else if (bird.imageUrl) {
                                    await deleteStorageFileIfApplicable(bird.imageUrl);
                                  }
                                  // Clean up documents
                                  if (bird.documents && bird.documents.length > 0) {
                                    for (const doc of bird.documents) {
                                      await deleteStorageFileIfApplicable(doc.url);
                                    }
                                  }`;

code = code.replace(targetBird, replacementBird);

// 3. Update Cage delete logic
const targetCage = `                                  if (cage.imageUrls && cage.imageUrls.length > 0) {
                                    for (const url of cage.imageUrls) {
                                      await deleteObject(ref(storage, url)).catch(e => console.error('Failed to delete cage image:', e));
                                    }
                                  } else if (cage.imageUrl) {
                                    await deleteObject(ref(storage, cage.imageUrl)).catch(e => console.error('Failed to delete cage image:', e));
                                  }`;

const replacementCage = `                                  if (cage.imageUrls && cage.imageUrls.length > 0) {
                                    for (const url of cage.imageUrls) {
                                      await deleteStorageFileIfApplicable(url);
                                    }
                                  } else if (cage.imageUrl) {
                                    await deleteStorageFileIfApplicable(cage.imageUrl);
                                  }`;

code = code.replace(targetCage, replacementCage);


// 4. Update Pair delete logic
const targetPair = `                                  if (pair.imageUrls && pair.imageUrls.length > 0) {
                                    for (const url of pair.imageUrls) {
                                      await deleteObject(ref(storage, url)).catch(e => console.error('Failed to delete pair image:', e));
                                    }
                                  }`;

const replacementPair = `                                  if (pair.imageUrls && pair.imageUrls.length > 0) {
                                    for (const url of pair.imageUrls) {
                                      await deleteStorageFileIfApplicable(url);
                                    }
                                  }`;

code = code.replace(targetPair, replacementPair);

fs.writeFileSync('src/App.tsx', code);
