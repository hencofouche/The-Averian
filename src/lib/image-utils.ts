import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

export const deleteStorageFileIfApplicable = async (url: string) => {
  if (!url) return;
  if (url.startsWith('https://firebasestorage.googleapis.com/')) {
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch (e) {
      console.error('Failed to delete storage file:', e);
    }
  }
};

export const compressAndUploadImage = async (file: File, path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to blob with quality adjustment to meet 1.5MB limit
        let quality = 0.8;
        let blob: Blob | null = null;
        let mimeType = 'image/webp';
        
        const getBlob = (q: number, type: string): Promise<Blob | null> => 
          new Promise(res => canvas.toBlob(b => res(b), type, q));

        blob = await getBlob(quality, mimeType);
        
        // Fallback to jpeg if webp fails or is not supported
        if (!blob) {
          mimeType = 'image/jpeg';
          blob = await getBlob(quality, mimeType);
        }
        
        // If still too large, reduce quality (though 1MB is the Firestore limit, base64 adds overhead)
        while (blob && blob.size > 0.7 * 1024 * 1024 && quality > 0.1) {
          quality -= 0.1;
          blob = await getBlob(quality, mimeType);
        }

        if (blob) {
          const readerBase64 = new FileReader();
          readerBase64.readAsDataURL(blob);
          readerBase64.onloadend = async () => {
            const base64data = readerBase64.result as string;
            
            try {
              // Upload to Firebase Storage
              const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
              const storageRef = ref(storage, `${path}/${fileName}`);
              await uploadString(storageRef, base64data, 'data_url');
              const downloadURL = await getDownloadURL(storageRef);
              resolve(downloadURL);
            } catch (err) {
              console.error('Upload error:', err);
              // Fallback to base64 if storage fails
              if (base64data.length > 1048487) {
                reject(new Error('Image is too large and storage upload failed.'));
              } else {
                resolve(base64data);
              }
            }
          };
          readerBase64.onerror = (e) => reject(e);
        } else {
          reject(new Error('Failed to compress image'));
        }
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};
