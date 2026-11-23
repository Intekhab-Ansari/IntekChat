import { headers } from 'next/headers';

export default async function robots() {
  let host = 'intekchat.vercel.app';
  try {
    const headerList = await headers();
    const reqHost = headerList.get('x-forwarded-host') || headerList.get('host');
    if (reqHost) host = reqHost;
  } catch (e) {}

  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
