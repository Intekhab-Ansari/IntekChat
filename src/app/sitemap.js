import { headers } from 'next/headers';

export default async function sitemap() {
  let host = 'intekchat.vercel.app';
  try {
    const headerList = await headers();
    const reqHost = headerList.get('x-forwarded-host') || headerList.get('host');
    if (reqHost) host = reqHost;
  } catch (e) {}

  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;
  const isDrop = host.toLowerCase().includes('intekdrop') || host.toLowerCase().includes('drop');
  const lastModified = new Date();

  return [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/?tab=${isDrop ? 'drop' : 'chat'}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/?tab=${isDrop ? 'chat' : 'drop'}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];
}
