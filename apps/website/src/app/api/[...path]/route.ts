/** Learner-only, read-only server-side gateway to the existing NestJS API.
 * We intentionally do not forward cookies, bearer headers, admin endpoints,
 * write methods or upstream error bodies. Draft hierarchies are filtered out.
 */
const ALLOWED = new Set(['apps', 'courses', 'courses/modules', 'courses/lessons', 'vocabulary', 'vocabulary/categories']);
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string,unknown>;
const json = (value:unknown,status=200):Response => Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const isRow = (value:unknown):value is Row => typeof value==='object' && value!==null && !Array.isArray(value);

async function upstreamRows(path:string,search=''):Promise<Row[]> {
  const root=(process.env.API_BASE_URL||'http://127.0.0.1:4000/api').replace(/\/+$/,'');
  const response=await fetch(`${root}/${path}${search}`,{method:'GET',headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(8000),redirect:'error'});
  if(!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
  const data:unknown=await response.json();
  if(!Array.isArray(data)||!data.every(isRow)) throw new Error('Unexpected upstream response');
  return data;
}
async function published(path:string,rows:Row[]):Promise<Row[]> {
  if(path==='courses') return rows.filter(c=>c.status==='PUBLISHED');
  if(path!=='courses/modules'&&path!=='courses/lessons') return rows;
  const courses=await upstreamRows('courses');
  const courseIds=new Set(courses.filter(c=>c.status==='PUBLISHED').map(c=>c.id));
  if(path==='courses/modules') return rows.filter(m=>m.status==='PUBLISHED'&&courseIds.has(m.courseId));
  const modules=await upstreamRows('courses/modules');
  const moduleIds=new Set(modules.filter(m=>m.status==='PUBLISHED'&&courseIds.has(m.courseId)).map(m=>m.id));
  return rows.filter(l=>l.status==='PUBLISHED'&&moduleIds.has(l.moduleId));
}
export async function GET(request:Request, context:{params:Promise<{path:string[]}>}):Promise<Response> {
  const {path:segments}=await context.params;
  const path=segments.join('/');
  if(!ALLOWED.has(path)) return json({message:'This endpoint is not available to learners.'},403);
  const search=new URL(request.url).searchParams;
  // The client only uses appId/categoryId, so reject other query parameters.
  for(const key of search.keys()) {
    if(!['appId','categoryId'].includes(key)) return json({message:'Unsupported query parameter.'},400);
  }
  if([...search.values()].some(v=>v.length>128)) return json({message:'Invalid filter value.'},400);
  if(search.size && !['courses','courses/modules','courses/lessons','vocabulary','vocabulary/categories'].includes(path)) return json({message:'Unsupported filter.'},400);
  try {
    const rows=await upstreamRows(path,search.toString()?`?${search}`:'');
    // Even if an API version accidentally starts returning drafts, fail closed.
    if(path==='vocabulary') return json(rows.filter(w=>w.isPublished===true&&w.status==='PUBLISHED'));
    if(path==='vocabulary/categories') return json(rows.filter(c=>c.isActive===true));
    if(path==='apps') return json(rows.filter(a=>a.isActive===true));
    return json(await published(path,rows));
  } catch {
    return json({message:'Public learning content is temporarily unavailable.'},503);
  }
}
export async function POST():Promise<Response>{return json({message:'Read-only public API.'},405);}
export async function PUT():Promise<Response>{return POST();}
export async function PATCH():Promise<Response>{return POST();}
export async function DELETE():Promise<Response>{return POST();}
