import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const root=path.resolve(import.meta.dirname,'..');
const entry=await fs.readFile(path.join(root,'src/app/api/[...path]/route.ts'),'utf8');
const compiled=ts.transpileModule(entry,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const route=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const fixtures={
 '/api/apps':[{id:'a1',level:'A1',isActive:true},{id:'a2',level:'A2',isActive:false}],
 '/api/courses':[{id:'c1',appId:'a1',status:'PUBLISHED'},{id:'c2',appId:'a1',status:'DRAFT'}],
 '/api/courses/modules':[{id:'m1',courseId:'c1',status:'PUBLISHED'},{id:'m2',courseId:'c2',status:'PUBLISHED'},{id:'m3',courseId:'c1',status:'DRAFT'}],
 '/api/courses/lessons':[{id:'l1',moduleId:'m1',status:'PUBLISHED'},{id:'l2',moduleId:'m2',status:'PUBLISHED'},{id:'l3',moduleId:'m3',status:'PUBLISHED'},{id:'l4',moduleId:'m1',status:'DRAFT'}],
 '/api/vocabulary/categories':[{id:'cat1',isActive:true},{id:'cat2',isActive:false}],
 '/api/vocabulary':[{id:'w1',isPublished:true,status:'PUBLISHED'},{id:'w2',isPublished:false,status:'DRAFT'},{id:'w3',isPublished:true,status:'DRAFT'}],
};
const upstream=http.createServer((req,res)=>{
  res.setHeader('Content-Type','application/json');
  const path=new URL(req.url,'http://localhost').pathname;
  res.statusCode=fixtures[path]?200:404;
  res.end(JSON.stringify(fixtures[path]??{error:'not found'}));
});
await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
process.env.API_BASE_URL=`http://127.0.0.1:${upstream.address().port}/api`;
const get=(p)=>route.GET(new Request(`http://localhost:3002/api/${p}`),{params:Promise.resolve({path:p.split('?')[0].split('/')})});
try {
  for(const [path,ids] of [
    ['apps',['a1']], ['courses',['c1']], ['courses/modules',['m1']],
    ['courses/lessons',['l1']],['vocabulary/categories',['cat1']],['vocabulary?appId=a1',['w1']]
  ]){
    const resp=await get(path);assert.equal(resp.status,200,path);
    const actual=(await resp.json()).map(x=>x.id);
    assert.deepEqual(actual,ids,path);
  }
  assert.equal((await get('admin/auth/me')).status,403,'admin routes blocked');
  assert.equal((await get('quizzes')).status,403,'admin quizzes blocked');
  assert.equal((await get('flashcards')).status,403,'admin flashcards blocked');
  assert.equal((await get('vocabulary?url=http://evil.test')).status,400,'invalid filter blocked');
  assert.equal((await route.POST()).status,405,'write routes blocked');
  const old=process.env.API_BASE_URL;
  process.env.API_BASE_URL='http://127.0.0.1:1/api';
  assert.equal((await get('apps')).status,503,'API offline mode');
  process.env.API_BASE_URL=old;
  console.log('PASS Next.js route handler: published-only data, draft ancestor filtering, admin/write restrictions, and API offline handling.');
}finally{upstream.close();}
