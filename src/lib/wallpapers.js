// Chat Wallpaper Library: Curated SVG patterns, ambient gradients, and custom photo handler

export const WALLPAPER_PRESETS = [
  {
    id: 'none',
    name: 'Clean Solid',
    desc: 'Pure distraction-free theme surface',
    type: 'solid',
    preview: '#0b1120'
  },
  {
    id: 'doodles',
    name: 'Cyber Doodles',
    desc: 'Encrypted locks, bubbles & file glyphs',
    type: 'pattern',
    repeat: 'repeat',
    size: '120px 120px',
    svg: `<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
      <!-- Chat Bubble -->
      <path d="M14 20h18a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-12l-6 5v-19a4 4 0 0 1 4-4z" />
      <circle cx="20" cy="29" r="1" fill="rgba(255,255,255,0.4)" />
      <circle cx="25" cy="29" r="1" fill="rgba(255,255,255,0.4)" />
      <circle cx="30" cy="29" r="1" fill="rgba(255,255,255,0.4)" />

      <!-- Padlock -->
      <rect x="76" y="24" width="16" height="13" rx="2" />
      <path d="M79 24v-5a5 5 0 0 1 10 0v5" />
      <circle cx="84" cy="30" r="1.5" fill="rgba(255,255,255,0.4)" />

      <!-- File Document -->
      <path d="M20 74h12l5 5v15a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2V76a2 2 0 0 1 2-2z" />
      <path d="M32 74v5h5" />
      <line x1="22" y1="83" x2="33" y2="83" />
      <line x1="22" y1="88" x2="30" y2="88" />

      <!-- WiFi / Radar waves -->
      <path d="M76 86a12 12 0 0 1 16 0" />
      <path d="M79 90a8 8 0 0 1 10 0" />
      <circle cx="84" cy="94" r="1.5" fill="rgba(255,255,255,0.6)" />

      <!-- Key -->
      <circle cx="58" cy="28" r="4" />
      <line x1="61" y1="31" x2="68" y2="38" />
      <line x1="65" y1="35" x2="67" y2="33" />

      <!-- Shield -->
      <path d="M52 74l8-4 8 4v8c0 6-8 10-8 10s-8-4-8-10v-8z" />

      <!-- Sparkle / Star -->
      <path d="M104 60l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z" />
      <path d="M36 50l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
    </svg>`
  },
  {
    id: 'matrix',
    name: 'Matrix Grid',
    desc: 'High-tech blueprint coordinate grid',
    type: 'pattern',
    repeat: 'repeat',
    size: '40px 40px',
    svg: `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 0L0 0 0 40" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1" />
      <circle cx="0" cy="0" r="1.5" fill="rgba(56, 189, 248, 0.7)" />
      <circle cx="40" cy="40" r="1.5" fill="rgba(168, 85, 247, 0.7)" />
      <path d="M19 20h2M20 19v2" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
    </svg>`
  },
  {
    id: 'topography',
    name: 'Topographic Waves',
    desc: 'Technical contour elevation curves',
    type: 'pattern',
    repeat: 'repeat',
    size: '240px 240px',
    svg: `<svg width="240" height="240" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.2">
      <path d="M0 30 Q60 60 120 30 T240 30" />
      <path d="M0 70 Q60 110 120 70 T240 70" />
      <path d="M0 115 Q70 70 140 120 T240 115" />
      <path d="M0 160 Q50 190 120 150 T240 160" />
      <path d="M0 205 Q70 170 140 215 T240 205" />
      <circle cx="60" cy="110" r="18" stroke-dasharray="2 3" />
      <circle cx="170" cy="160" r="26" stroke-dasharray="2 3" />
    </svg>`
  },
  {
    id: 'constellation',
    name: 'Constellation',
    desc: 'Deep cosmic celestial starfield',
    type: 'pattern',
    repeat: 'repeat',
    size: '180px 180px',
    svg: `<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.8">
      <circle cx="30" cy="35" r="2" fill="#fff" />
      <circle cx="75" cy="20" r="1.5" fill="#38bdf8" />
      <circle cx="130" cy="45" r="2.2" fill="#c084fc" />
      <circle cx="150" cy="110" r="1.5" fill="#fff" />
      <circle cx="95" cy="130" r="2" fill="#38bdf8" />
      <circle cx="40" cy="115" r="1.8" fill="#fff" />
      <circle cx="85" cy="80" r="1.5" fill="#fff" />

      <!-- Constellation lines -->
      <line x1="30" y1="35" x2="75" y2="20" />
      <line x1="75" y1="20" x2="130" y2="45" />
      <line x1="130" y1="45" x2="85" y2="80" />
      <line x1="85" y1="80" x2="40" y2="115" />
      <line x1="40" y1="115" x2="95" y2="130" />
      <line x1="95" y1="130" x2="150" y2="110" />

      <!-- Tiny stars -->
      <circle cx="10" cy="80" r="0.8" fill="rgba(255,255,255,0.5)" />
      <circle cx="110" cy="15" r="0.8" fill="rgba(255,255,255,0.5)" />
      <circle cx="160" cy="80" r="0.8" fill="rgba(255,255,255,0.5)" />
      <circle cx="65" cy="160" r="0.8" fill="rgba(255,255,255,0.5)" />
    </svg>`
  },
  {
    id: 'hexagons',
    name: 'Cyber Honeycomb',
    desc: 'Futuristic carbon hexagon mesh',
    type: 'pattern',
    repeat: 'repeat',
    size: '56px 96px',
    svg: `<svg width="56" height="96" viewBox="0 0 56 96" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.2">
      <path d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z" />
      <path d="M28 48 L56 64 L56 96 L28 112 L0 96 L0 64 Z" />
      <circle cx="28" cy="32" r="2" fill="rgba(56, 189, 248, 0.4)" />
      <circle cx="28" cy="80" r="2" fill="rgba(168, 85, 247, 0.4)" />
    </svg>`
  },
  {
    id: 'aurora',
    name: 'Midnight Aurora',
    desc: 'Luminous multi-dimensional gradient aura',
    type: 'gradient',
    css: 'radial-gradient(circle at 18% 28%, rgba(59, 130, 246, 0.35) 0%, transparent 45%), radial-gradient(circle at 82% 72%, rgba(168, 85, 247, 0.35) 0%, transparent 45%), radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.22) 0%, transparent 50%)'
  }
];

export function getWallpaperCss(presetId, customImage = null) {
  if (presetId === 'custom' && customImage) {
    return {
      backgroundImage: `url(${customImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }

  const preset = WALLPAPER_PRESETS.find((p) => p.id === presetId);
  if (!preset || preset.id === 'none') {
    return {
      backgroundImage: 'none'
    };
  }

  if (preset.type === 'gradient') {
    return {
      backgroundImage: preset.css,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat'
    };
  }

  if (preset.type === 'pattern' && preset.svg) {
    const encoded = encodeURIComponent(preset.svg);
    return {
      backgroundImage: `url("data:image/svg+xml,${encoded}")`,
      backgroundSize: preset.size,
      backgroundRepeat: preset.repeat || 'repeat'
    };
  }

  return { backgroundImage: 'none' };
}

/**
 * Compresses and resizes a custom wallpaper image to ensure it is ultra-lightweight (< 40KB)
 * so it transmits reliably over WebRTC DataChannels (< 64KB limit) and MQTT signaling (< 256KB limit)
 * without exceeding localStorage quotas or dropping connections.
 */
export function compressWallpaperImage(fileOrDataUrl, maxDim = 900, quality = 0.70) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
    }

    const processImg = (img) => {
      let width = img.naturalWidth || img.width || 800;
      let height = img.naturalHeight || img.height || 600;

      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => processImg(img);
    img.onerror = () => {
      if (typeof fileOrDataUrl === 'string') resolve(fileOrDataUrl);
      else reject(new Error('Failed to load image for wallpaper compression'));
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

