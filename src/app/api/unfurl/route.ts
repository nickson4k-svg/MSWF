import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NexusChatBot/1.0 (Link Preview)' },
    });
    clearTimeout(timeout);

    const html = await res.text();

    // Parse OpenGraph tags
    const getMetaContent = (property: string): string | null => {
      const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
      const altRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, 'i');
      const match = html.match(regex) || html.match(altRegex);
      return match ? match[1] : null;
    };

    const title = getMetaContent('og:title') || getMetaContent('twitter:title') || html.match(/<title>([^<]*)<\/title>/i)?.[1] || null;
    const description = getMetaContent('og:description') || getMetaContent('twitter:description') || getMetaContent('description') || null;
    const image = getMetaContent('og:image') || getMetaContent('twitter:image') || null;
    const siteName = getMetaContent('og:site_name') || null;

    return NextResponse.json({ title, description, image, siteName, url });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 500 });
  }
}
