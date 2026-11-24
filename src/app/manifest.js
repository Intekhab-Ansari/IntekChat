export default function manifest() {
  return {
    name: 'intekchat & intekdrop | P2P File Sharing & Encrypted Chat',
    short_name: 'intekchat',
    description: 'Ultra-fast direct P2P file sharing and private encrypted instant chat with zero server storage. Free open-source AirDrop alternative for all platforms.',
    start_url: '/',
    display: 'standalone',
    background_color: '#070a12',
    theme_color: '#070a12',
    categories: ['utilities', 'productivity', 'communication'],
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
