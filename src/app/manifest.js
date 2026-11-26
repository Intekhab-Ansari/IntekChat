import { headers } from 'next/headers';

export default async function manifest() {
  let host = 'intekchat.vercel.app';
  try {
    const headerList = await headers();
    const reqHost = headerList.get('x-forwarded-host') || headerList.get('host');
    if (reqHost) host = reqHost;
  } catch (e) {}

  const isDrop = host.toLowerCase().includes('intekdrop') || host.toLowerCase().includes('drop');

  return {
    name: isDrop
      ? 'intekdrop | Ultra-Fast P2P File Sharing'
      : 'intekchat | Private Encrypted Chat & P2P File Sharing',
    short_name: isDrop ? 'intekdrop' : 'intekchat',
    description: isDrop
      ? 'Ultra-fast direct P2P file sharing with zero file size limits and zero server storage. Free open-source AirDrop alternative for all platforms.'
      : 'Ultra-fast direct P2P file sharing and private encrypted instant chat with zero server storage. Free open-source AirDrop alternative for all platforms.',
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
