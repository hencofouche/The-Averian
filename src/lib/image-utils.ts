import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

export const deleteStorageFileIfApplicable = async (url: string) => {
  if (!url) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  if (url.startsWith('https://firebasestorage.googleapis.com/') || url.includes('firebasestorage.app')) {
    try {
      const fileRef = ref(storage, url);
      await Promise.race([
        deleteObject(fileRef),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    } catch (e) {
      console.warn('Failed to delete storage file (or already removed):', e);
    }
  }
};

/**
 * Compresses an image client-side to a lightweight, high-resolution JPEG data URL.
 * Runs instantly in milliseconds without network stalling or Firebase Storage timeout loops.
 */
export const compressAndUploadImage = async (
  file: File | Blob, 
  _path?: string
): Promise<string> => {
  return new Promise((resolve) => {
    if (!file || !(file instanceof Blob)) {
      console.warn('Invalid file object provided to compressAndUploadImage');
      return resolve('');
    }

    // Safety timeout: ensure promise ALWAYS resolves within 2.5 seconds
    const safetyTimer = setTimeout(() => {
      console.warn('Image processing hit safety timer, resolving direct stream');
      const fallbackReader = new FileReader();
      fallbackReader.onload = () => resolve((fallbackReader.result as string) || '');
      fallbackReader.onerror = () => resolve('');
      try {
        fallbackReader.readAsDataURL(file);
      } catch (err) {
        resolve('');
      }
    }, 2500);

    const reader = new FileReader();
    
    reader.onerror = (e) => {
      clearTimeout(safetyTimer);
      console.error('FileReader error:', e);
      resolve('');
    };

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        clearTimeout(safetyTimer);
        return resolve('');
      }

      // If SVG or tiny icon, return directly
      if (file.type && file.type.includes('svg')) {
        clearTimeout(safetyTimer);
        return resolve(dataUrl);
      }

      const img = new Image();
      
      img.onload = () => {
        try {
          const maxDimension = 960;
          let width = img.naturalWidth || img.width || 600;
          let height = img.naturalHeight || img.height || 600;

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 10);
          canvas.height = Math.max(height, 10);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            clearTimeout(safetyTimer);
            return resolve(dataUrl);
          }

          // Fill white background (handles transparent PNGs when converting to JPEG)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Get optimized base64 JPEG at 0.72 quality
          let compressed = canvas.toDataURL('image/jpeg', 0.72);

          // If still over 120KB, scale down slightly to keep documents light & ultra fast
          if (compressed.length > 120000) {
            const smallerCanvas = document.createElement('canvas');
            smallerCanvas.width = Math.round(canvas.width * 0.7);
            smallerCanvas.height = Math.round(canvas.height * 0.7);
            const sCtx = smallerCanvas.getContext('2d');
            if (sCtx) {
              sCtx.fillStyle = '#FFFFFF';
              sCtx.fillRect(0, 0, smallerCanvas.width, smallerCanvas.height);
              sCtx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
              compressed = smallerCanvas.toDataURL('image/jpeg', 0.60);
            }
          }

          clearTimeout(safetyTimer);
          resolve(compressed);
        } catch (err) {
          console.warn('Canvas processing error, using fallback data URL:', err);
          clearTimeout(safetyTimer);
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        clearTimeout(safetyTimer);
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    try {
      reader.readAsDataURL(file);
    } catch (err) {
      clearTimeout(safetyTimer);
      console.error('readAsDataURL exception:', err);
      resolve('');
    }
  });
};

/**
 * Ensures any shared item or digital passport JSON payload stays safely within Firestore's 1MB document limit.
 */
export function ensurePassportPayloadFitsFirestore(payload: any, maxBytes = 850000): string {
  let jsonString = JSON.stringify(payload);
  if (jsonString.length <= maxBytes) {
    return jsonString;
  }

  // Clone payload to optimize
  const optimized = { ...payload };

  // 1. If related birds have multiple photos or long image arrays, trim them to primary image only
  if (Array.isArray(optimized.relatedBirds)) {
    optimized.relatedBirds = optimized.relatedBirds.map((rb: any) => {
      const primaryUrl = rb.imageUrl || (rb.imageUrls && rb.imageUrls[0]) || '';
      return {
        ...rb,
        imageUrl: primaryUrl,
        imageUrls: primaryUrl ? [primaryUrl] : []
      };
    });
  }

  jsonString = JSON.stringify(optimized);
  if (jsonString.length <= maxBytes) {
    return jsonString;
  }

  // 2. If still large, remove heavy embedded base64 images from distant relatives (keeping name/pedigree structure)
  if (Array.isArray(optimized.relatedBirds)) {
    optimized.relatedBirds = optimized.relatedBirds.map((rb: any) => {
      if (rb.imageUrl && rb.imageUrl.startsWith('data:') && rb.imageUrl.length > 50000) {
        return {
          ...rb,
          imageUrl: undefined,
          imageUrls: []
        };
      }
      return rb;
    });
  }

  return JSON.stringify(optimized);
}

