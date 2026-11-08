import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const upstreamData = {
  '/api/apps': [{ id:'app-a1', level:'A1', isActive:true }],
  '/api/courses': [
    { id:'c1', status:'PUBLISHED' },
    { id:'c2', status:'DRAFT' },
  ],
  '/api/courses/modules': [
    { id:'m1', courseId:'c1', status:'PUBLISHED' },
    { id:'m2', courseId:'c2', status:'PUBLISHED' },
    { id:'m3', courseId:'c1', status:'DRAFT' },
  ],
  '/api/courses/lessons': [
    { id:'l1', moduleId:'m1', status:'PUBLISHED' },
    { id:'l2', moduleId:'m2', status:'PUBLISHED' },
    { id:'l3', moduleId:'m3', status:'PUBLISHED' },
    { id:'l4', moduleId:'m1', status:'REVIEW' },
  ],
  '/api/vocabulary/categories': [{ id:'cat1',name:'Greetings' }],
  '/api/vocabulary': [{ id:'w1',isPublished:true,status:'PUBLISHED' }],
};
const api = http.createServer((req, res) => {
  res.setHeader('Content-Type','application/json');
  const key = new URL(req.url,'http://127.0.0.1').pathname;
  res.statusCode = upstreamData[key] ? 200 : 404;
  res.end(JSON.stringify(upstreamData[key] ?? {message:'Unknown route'}));
});
const randomPort = () => new Promise(resolve => {
  const s=net.createServer();
  s.listen(0,'127.0.0.1',()=>{ const p=s.address().port; s.close(()=>resolve(p)); });
});
await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
const backendPort=api.address().port;
const sitePort=await randomPort();
const site = spawn(process.execPath,['server.mjs'],{
  cwd:root, env:{...process.env,PORT:String(sitePort),API_BASE_URL:`http://127.0.0.1:${backendPort}/api`}, stdio:'ignore',
});
const base=`http://127.0.0.1:${sitePort}`;
async function ready() {
  for (let i=0;i<75;i++) {
    try { const res=await fetch(`${base}/`); if(res.ok) return; } catch { /* starting */ }
    await new Promise(r=>setTimeout(r,60));
  }
  throw new Error('Website server failed to start');
}
try {
  await ready();
  for (const [endpoint,expected] of [
    ['/api/courses',['c1']],
    ['/api/courses/modules',['m1']],
    ['/api/courses/lessons',['l1']],
  ]) {
    const response=await fetch(`${base}${endpoint}`);
    assert.equal(response.status,200,endpoint);
    const rows=await response.json();
    assert.deepEqual(rows.map(x=>x.id),expected,endpoint);
  }
  assert.equal((await (await fetch(`${base}/api/vocabulary?appId=app-a1`)).json())[0].id,'w1');
  assert.equal((await fetch(`${base}/api/admin/auth/me`)).status,403,'Admin auth should not be proxied');
  assert.equal((await fetch(`${base}/api/quizzes`)).status,403,'Admin quizzes should not be proxied');
  assert.equal((await fetch(`${base}/api/courses`,{method:'POST'})).status,403,'No writes');
  assert.match(await (await fetch(`${base}/lessons/l1`)).text(),/<!doctype html>/i,'SPA deep links');
  console.log('PASS: read-only public API proxy, published hierarchy, blocked admin routes/writes, and SPA deep links.');
} finally {
  site.kill('SIGTERM');
  await new Promise(resolve=>api.close(resolve));
}
