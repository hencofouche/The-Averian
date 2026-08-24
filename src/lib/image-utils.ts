import { ref, uploadBytes, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

export const deleteStorageFileIfApplicable = async (url: string) => {
  if (!url) return;
  if (url.startsWith('https://firebasestorage.googleapis.com/') || url.includes('firebasestorage.app')) {
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch (e) {
      console.error('Failed to delete storage file:', e);
    }
  }
};

/**
 * Compresses an image file and uploads it to Firebase Storage (with fallback to base64 if storage is unavailable).
 */
export const compressAndUploadImage = async (
  file: File | Blob, 
  path: string, 
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof Blob)) {
      return reject(new Error('Invalid file object provided'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const result = event.target?.result;
      if (!result || typeof result !== 'string') {
        return reject(new Error('Could not read image file data'));
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = result;

      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width || 800;
          let height = img.height || 600;
          const MAX_DIMENSION = 1280;

          if (width > height) {
            if (width > MAX_DIMENSION) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            }
          } else {
            if (height > MAX_DIMENSION) {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }

          canvas.width = Math.max(width, 10);
          canvas.height = Math.max(height, 10);
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            return resolve(result);
          }

          // Fill white background for transparent images converted to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Get compressed Blob for binary upload
          const blobPromise = new Promise<Blob | null>((res) => {
            canvas.toBlob((b) => res(b), 'image/jpeg', 0.82);
          });
          const blob = await blobPromise;

          const cleanPath = path ? path.replace(/^\/+|\/+$/g, '') : 'marketplace';
          const randomSuffix = Math.random().toString(36).substring(2, 9);
          const fileName = `${Date.now()}_${randomSuffix}.jpg`;
          const storageRef = ref(storage, `${cleanPath}/${fileName}`);

          if (blob) {
            try {
              const snapshot = await uploadBytes(storageRef, blob, {
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=31536000',
                customMetadata: { uploadedAt: new Date().toISOString() }
              });
              const downloadURL = await getDownloadURL(snapshot.ref);
              if (downloadURL) {
                return resolve(downloadURL);
              }
            } catch (byteErr) {
              console.warn('uploadBytes storage attempt failed, attempting uploadString...', byteErr);
            }
          }

          // Fallback to uploadString
          let base64data = canvas.toDataURL('image/jpeg', 0.80);
          try {
            await uploadString(storageRef, base64data, 'data_url');
            const downloadURL = await getDownloadURL(storageRef);
            if (downloadURL) {
              return resolve(downloadURL);
            }
          } catch (stringErr) {
            console.warn('Storage upload unavailable, falling back to optimized lightweight data URL:', stringErr);
          }

          // Final fallback: Return compact base64 data url (under 50KB to preserve Firestore document size)
          let fallbackCanvas = canvas;
          if (canvas.width > 800 || canvas.height > 800) {
            fallbackCanvas = document.createElement('canvas');
            const scale = Math.min(800 / canvas.width, 800 / canvas.height);
            fallbackCanvas.width = Math.round(canvas.width * scale);
            fallbackCanvas.height = Math.round(canvas.height * scale);
            const fbCtx = fallbackCanvas.getContext('2d');
            if (fbCtx) {
              fbCtx.drawImage(canvas, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
            }
          }
          const compactBase64 = fallbackCanvas.toDataURL('image/jpeg', 0.65);
          resolve(compactBase64);
        } catch (err: any) {
          console.warn('Canvas processing error, using raw file data fallback:', err);
          resolve(result);
        }
      };

      img.onerror = (e) => {
        console.warn('Image element decode error, providing raw reader result:', e);
        resolve(result);
      };
    };

    reader.onerror = (e) => {
      console.error('FileReader failure:', e);
      reject(new Error('Failed to read selected image file'));
    };
  });
};
