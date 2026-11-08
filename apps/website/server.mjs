import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const upstream = (process.env.API_BASE_URL || 'http://127.0.0.1:4000/api').replace(/\/+$/, '');
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.webp': 'image/webp' };

// This frontend is read-only. Never proxy administrative, payment, or user-account routes.
const allowedPaths = [/^\/apps(?:\/[a-zA-Z0-9_-]+)?$/, /^\/courses$/, /^\/courses\/modules$/, /^\/courses\/lessons$/, /^\/vocabulary$/, /^\/vocabulary\/categories$/, /^\/vocabulary\/[a-zA-Z0-9_-]+$/];

async function publicRows(apiPath) {
  const response = await fetch(`${upstream}${apiPath}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Unexpected upstream response');
  return data;
}

// The supplied API's course routes are public even for drafts. The learner proxy
// filters unpublished records before returning them to the browser. The underlying
// API itself must still be secured separately before a production launch.
async function publishedRows(apiPath, rows) {
  if (!Array.isArray(rows)) throw new Error('Unexpected upstream response');
  if (apiPath === '/courses') return rows.filter(c => c.status === 'PUBLISHED');
  const courses = await publicRows('/courses');
  const courseIds = new Set(courses.filter(c => c.status === 'PUBLISHED').map(c => c.id));
  if (apiPath === '/courses/modules') {
    return rows.filter(m => m.status === 'PUBLISHED' && courseIds.has(m.courseId));
  }
  const modules = await publicRows('/courses/modules');
  const moduleIds = new Set(modules.filter(m => m.status === 'PUBLISHED' && courseIds.has(m.courseId)).map(m => m.id));
  return rows.filter(l => l.status === 'PUBLISHED' && moduleIds.has(l.moduleId));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const send = (code, data, headers = {}) => { res.writeHead(code, headers); res.end(data); };
    if (url.pathname.startsWith('/api/')) {
      const apiPath = url.pathname.slice(4);
      if (req.method !== 'GET' || !allowedPaths.some(r => r.test(apiPath))) {
        send(403, JSON.stringify({ message: 'This website allows only public, read-only API endpoints.' }), { 'Content-Type': 'application/json' });
        return;
      }
      try {
        const upstreamResponse = await fetch(`${upstream}${apiPath}${url.search}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        });
        const content = await upstreamResponse.text();
        if (upstreamResponse.ok && ['/courses', '/courses/modules', '/courses/lessons'].includes(apiPath)) {
          const visible = await publishedRows(apiPath, JSON.parse(content));
          send(200, JSON.stringify(visible), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        } else {
          send(upstreamResponse.status, content, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        }
      } catch {
        send(503, JSON.stringify({ message: 'Backend API is not reachable. Preview content may be shown.' }), { 'Content-Type': 'application/json; charset=utf-8' });
      }
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(405, 'Method not allowed'); return;
    }
    const filePath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const resolved = path.resolve(root, `.${filePath}`);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      send(403, 'Forbidden'); return;
    }
    let target = resolved;
    try {
      const stat = await fs.stat(target);
      if (!stat.isFile()) target = path.join(root, 'index.html');
    } catch {
      if (path.extname(target)) { send(404, 'Not found'); return; }
      target = path.join(root, 'index.html');
    }
    const bytes = await fs.readFile(target);
    send(200, req.method === 'HEAD' ? '' : bytes, { 'Content-Type': mimeTypes[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
  } catch (error) {
    res.writeHead(500); res.end('Server error');
    console.error(error);
  }
});
server.listen(port, '0.0.0.0', () => {
  console.log(`Wortly learner website: http://localhost:${port}`);
  console.log(`API proxy: ${upstream} (GET public endpoints only)`);
});
