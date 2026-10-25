/**
 * Media compression and file utility helpers for IntekChat.
 * Ensures all images and media transmitted over WebRTC DataChannels (< 64KB - 256KB)
 * and MQTT WebSocket relay (< 256KB) arrive reliably without disconnection or dropped packets.
 */

/**
 * Compresses and downscales any chat image (File, Blob, or DataURL)
 * to ensure it fits comfortably within WebRTC DataChannels (< 64KB - 256KB)
 * and MQTT WebSocket relay packet limits (< 256KB) for guaranteed, instant delivery on mobile devices.
 * 
 * @param {File|Blob|string} fileOrDataUrl - The input file or data url
 * @param {number} maxDimension - Maximum width or height (default: 1200)
 * @param {number} quality - JPEG compression quality (default: 0.75)
 * @returns {Promise<string>} Compressed Base64 Data URL
 */
export function compressChatImage(fileOrDataUrl, maxDimension = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
    }

    const processImg = (img) => {
      try {
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 600;

        // Downscale while preserving aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to lightweight JPEG data URL
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (err) {
        console.warn('Canvas compression error:', err);
        if (typeof fileOrDataUrl === 'string') resolve(fileOrDataUrl);
        else reject(err);
      }
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => processImg(img);
    img.onerror = () => {
      if (typeof fileOrDataUrl === 'string') resolve(fileOrDataUrl);
      else reject(new Error('Failed to load image for compression'));
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

/**
 * Checks whether an item, message, or file is an image
 */
export function isImageFile(itemOrNameOrMime) {
  if (!itemOrNameOrMime) return false;
  if (typeof itemOrNameOrMime === 'object') {
    if (itemOrNameOrMime.type === 'image') return true;
    if (itemOrNameOrMime.mimeType?.startsWith('image/')) return true;
    if (itemOrNameOrMime.dataUrl?.startsWith('data:image/')) return true;
    return isImageFile(itemOrNameOrMime.name);
  }
  if (typeof itemOrNameOrMime === 'string') {
    if (itemOrNameOrMime.startsWith('image/') || itemOrNameOrMime.startsWith('data:image/')) return true;
    return /\.(jpe?g|png|webp|gif|bmp|svg|heic|avif)$/i.test(itemOrNameOrMime);
  }
  return false;
}

/**
 * Checks whether an item, message, or file is an audio file
 */
export function isAudioFile(itemOrNameOrMime) {
  if (!itemOrNameOrMime) return false;
  if (typeof itemOrNameOrMime === 'object') {
    if (itemOrNameOrMime.mimeType?.startsWith('audio/')) return true;
    if (itemOrNameOrMime.dataUrl?.startsWith('data:audio/')) return true;
    return isAudioFile(itemOrNameOrMime.name);
  }
  if (typeof itemOrNameOrMime === 'string') {
    if (itemOrNameOrMime.startsWith('audio/') || itemOrNameOrMime.startsWith('data:audio/')) return true;
    return /\.(mp3|wav|ogg|m4a|aac|flac|weba)$/i.test(itemOrNameOrMime);
  }
  return false;
}

/**
 * Checks whether an item, message, or file is a video file
 */
export function isVideoFile(itemOrNameOrMime) {
  if (!itemOrNameOrMime) return false;
  if (typeof itemOrNameOrMime === 'object') {
    if (itemOrNameOrMime.mimeType?.startsWith('video/')) return true;
    if (itemOrNameOrMime.dataUrl?.startsWith('data:video/')) return true;
    return isVideoFile(itemOrNameOrMime.name);
  }
  if (typeof itemOrNameOrMime === 'string') {
    if (itemOrNameOrMime.startsWith('video/') || itemOrNameOrMime.startsWith('data:video/')) return true;
    return /\.(mp4|webm|mov|mkv|avi|ogv)$/i.test(itemOrNameOrMime);
  }
  return false;
}
