const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                                  await batch.commit();
                                  toast.success('Bird and associated pair data deleted');`;

const replacement = `                                  await batch.commit();
                                  
                                  // Clean up images from storage
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
                                  }
                                  
                                  toast.success('Bird and associated pair data deleted');`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
