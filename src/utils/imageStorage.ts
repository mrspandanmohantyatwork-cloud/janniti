/**
 * Utility for handling image uploads and local persistent storage
 */

export const STORAGE_KEYS = {
  CUSTOM_LOGO: 'civic_custom_logo',
  DEV_PHOTO_PREFIX: 'civic_dev_photo_',
};

/**
 * Resizes and optimizes an image file to a base64 Data URL
 * to avoid exceeding browser localStorage limits.
 */
export const processImageFile = (file: File, maxSize = 600): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to decode image.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file from device.'));
    reader.readAsDataURL(file);
  });
};

export const getCustomLogo = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.CUSTOM_LOGO);
  } catch {
    return null;
  }
};

export const saveCustomLogo = (dataUrl: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_LOGO, dataUrl);
    window.dispatchEvent(new Event('civic-logo-updated'));
  } catch (err) {
    console.error('Failed to save logo to localStorage:', err);
  }
};

export const removeCustomLogo = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_LOGO);
    window.dispatchEvent(new Event('civic-logo-updated'));
  } catch (err) {
    console.error('Failed to remove custom logo:', err);
  }
};

export const getDeveloperPhoto = (memberId: string): string | null => {
  try {
    return localStorage.getItem(`${STORAGE_KEYS.DEV_PHOTO_PREFIX}${memberId}`);
  } catch {
    return null;
  }
};

export const getAllDeveloperPhotos = (): Record<string, string> => {
  const photos: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.DEV_PHOTO_PREFIX)) {
        const memberId = key.replace(STORAGE_KEYS.DEV_PHOTO_PREFIX, '');
        const val = localStorage.getItem(key);
        if (val) photos[memberId] = val;
      }
    }
  } catch (err) {
    console.error('Failed to read developer photos:', err);
  }
  return photos;
};

export const saveDeveloperPhoto = (memberId: string, dataUrl: string): void => {
  try {
    localStorage.setItem(`${STORAGE_KEYS.DEV_PHOTO_PREFIX}${memberId}`, dataUrl);
    window.dispatchEvent(new Event('civic-dev-photos-updated'));
  } catch (err) {
    console.error('Failed to save developer photo to localStorage:', err);
  }
};

export const removeDeveloperPhoto = (memberId: string): void => {
  try {
    localStorage.removeItem(`${STORAGE_KEYS.DEV_PHOTO_PREFIX}${memberId}`);
    window.dispatchEvent(new Event('civic-dev-photos-updated'));
  } catch (err) {
    console.error('Failed to remove developer photo:', err);
  }
};
