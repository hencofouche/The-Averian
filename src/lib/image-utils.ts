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
    if (!file || !(file instanceof Blob)) {
      return reject(new Error('Invalid file object provided'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width || 800;
          let height = img.height || 600;
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // If canvas context fails, use base64 result directly
            return resolve(event.target?.result as string);
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Get base64 representation with reasonable quality
          let base64data = canvas.toDataURL('image/jpeg', 0.82);

          // If still over 800KB, re-compress with lower quality
          if (base64data.length > 800000) {
            base64data = canvas.toDataURL('image/jpeg', 0.65);
          }
          if (base64data.length > 800000) {
            base64data = canvas.toDataURL('image/jpeg', 0.5);
          }

          try {
            // Upload to Firebase Storage
            const cleanPath = path ? path.replace(/^\/+|\/+$/g, '') : 'uploads';
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
            const storageRef = ref(storage, `${cleanPath}/${fileName}`);
            await uploadString(storageRef, base64data, 'data_url');
            const downloadURL = await getDownloadURL(storageRef);
            resolve(downloadURL);
          } catch (storageErr) {
            console.warn('Storage upload error, falling back to base64 data URL:', storageErr);
            // Fallback to base64 data url directly
            resolve(base64data);
          }
        } catch (err: any) {
          console.warn('Canvas compression issue, using direct file reader result:', err);
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (e) => {
        // Direct fallback
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to load image file'));
        }
      };
    };
    reader.onerror = (e) => reject(new Error('Failed to read selected file'));
  });
};
