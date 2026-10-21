// Client device detection, anonymous codenames, and avatar generator

const ADJECTIVES = [
  'Cyber', 'Quantum', 'Neon', 'Solar', 'Phantom', 'Cosmic', 'Hyper',
  'Astral', 'Shadow', 'Sonic', 'Vortex', 'Echo', 'Stealth', 'Nexus',
  'Titan', 'Zenith', 'Chrono', 'Pulse', 'Mirage', 'Apex', 'Prism'
];

const NOUNS = [
  'Falcon', 'Leopard', 'Panther', 'Phoenix', 'Viper', 'Lynx', 'Fox',
  'Hawk', 'Wolf', 'Raven', 'Ghost', 'Matrix', 'Comet', 'Ranger',
  'Voyager', 'Spectre', 'Drifter', 'Nova', 'Prowler', 'Eagle', 'Titan'
];

const AVATAR_COLORS = [
  { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#60a5fa', glow: 'rgba(59, 130, 246, 0.4)' }, // Sapphire Blue
  { bg: 'rgba(6, 182, 212, 0.15)', border: '#06b6d4', text: '#38bdf8', glow: 'rgba(6, 182, 212, 0.4)' },   // Arctic Cyan
  { bg: 'rgba(139, 92, 246, 0.15)', border: '#8b5cf6', text: '#c084fc', glow: 'rgba(139, 92, 246, 0.4)' }, // Royal Violet
  { bg: 'rgba(236, 72, 153, 0.15)', border: '#ec4899', text: '#f472b6', glow: 'rgba(236, 72, 153, 0.4)' }, // Electric Rose
  { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#fbbf24', glow: 'rgba(245, 158, 11, 0.4)' }, // Radiant Amber
  { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#34d399', glow: 'rgba(16, 185, 129, 0.4)' }  // Fresh Mint
];

export function generateRandomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}

export function detectDevice() {
  if (typeof window === 'undefined' || !navigator) {
    return { deviceType: 'desktop', os: 'windows' };
  }

  const ua = navigator.userAgent || '';
  let deviceType = 'desktop';
  let os = 'other';

  // Device detection
  if (/iPad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle/i.test(ua)) {
    deviceType = 'mobile';
  }

  // OS detection
  if (/Win/i.test(ua)) os = 'windows';
  else if (/Mac/i.test(ua)) os = 'macos';
  else if (/Linux/i.test(ua)) os = 'linux';
  else if (/Android/i.test(ua)) os = 'android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'ios';

  return { deviceType, os };
}

export function getOrCreatePeerProfile() {
  if (typeof window === 'undefined') {
    return {
      name: 'Cyber Falcon',
      deviceType: 'desktop',
      os: 'windows',
      colorIndex: 0
    };
  }

  try {
    const saved = localStorage.getItem('intekchat_profile');
    if (saved) {
      const parsed = JSON.parse(saved);
      const { deviceType, os } = detectDevice();
      return { ...parsed, deviceType, os };
    }
  } catch {}

  const { deviceType, os } = detectDevice();
  const profile = {
    name: generateRandomName(),
    deviceType,
    os,
    colorIndex: Math.floor(Math.random() * AVATAR_COLORS.length)
  };

  try {
    localStorage.setItem('intekchat_profile', JSON.stringify(profile));
  } catch {}

  return profile;
}

export function savePeerProfile(updated) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('intekchat_profile', JSON.stringify(updated));
  } catch {}
}

export function getAvatarColor(index = 0) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
