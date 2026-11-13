import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_BASE = (
  process.env.LEARNING_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://learning-api.mochiflix.com/api'
).replace(/\/+$/, '');

const ALLOWED: Record<string, string[]> = {
  GET: ['me'],
  POST: ['login', 'refresh', 'logout', 'logout-all'],
};

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (origin) return origin === request.nextUrl.origin;
  const referer = request.headers.get('referer');
  if (referer) {
    try { return new URL(referer).origin === request.nextUrl.origin; }
    catch { return false; }
  }
  // Require a browser Origin or Referer for state-changing requests.
  return false;
}

async function proxy(request: NextRequest, segments: string[]) {
  const method = request.method.toUpperCase();
  const action = segments.join('/');
  if (!ALLOWED[method]?.includes(action)) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  if (method !== 'GET' && !sameOrigin(request)) {
    return NextResponse.json({ message: 'Invalid request origin' }, { status: 403 });
  }

  const upstreamUrl = new URL(`${API_BASE}/admin/auth/${action}`);
  const upstreamOrigin = upstreamUrl.origin;
  const headers = new Headers({ accept: 'application/json' });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const authorization = request.headers.get('authorization');
  if (authorization) headers.set('authorization', authorization);
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  // The upstream Admin Auth validates Origin for CSRF; browser origin was
  // checked above, and the server forwards its own trusted API origin.
  headers.set('origin', upstreamOrigin);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers,
      body: method === 'GET' ? undefined : await request.text(),
      redirect: 'manual',
      cache: 'no-store',
      signal: request.signal,
    });
    const responseHeaders = new Headers({ 'cache-control': 'no-store, private' });
    const type = upstreamResponse.headers.get('content-type');
    if (type) responseHeaders.set('content-type', type);
    // Preserve the upstream HttpOnly refresh cookie and its Path attributes.
    const setCookie = upstreamResponse.headers.get('set-cookie');
    if (setCookie) responseHeaders.append('set-cookie', setCookie);

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { message: 'Authentication service unavailable' },
      { status: 502, headers: { 'cache-control': 'no-store' } },
    );
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: Ctx) {
  return proxy(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: Ctx) {
  return proxy(request, (await context.params).path);
}
