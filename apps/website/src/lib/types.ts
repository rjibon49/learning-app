export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export const LEVELS: Level[] = ['A1','A2','B1','B2','C1'];
export const LEVEL_NAMES: Record<Level,string> = {
  A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate', B2: 'Upper intermediate', C1: 'Advanced',
};
export interface LearnerApp { id:string; level: Level; name:string; slug?:string; isActive:boolean }
export interface Course { id:string; appId:string; title:string; description?:string|null; status:string; sortOrder?:number; slug?:string }
export interface CourseModule { id:string; courseId:string; title:string; description?:string|null; status:string; sortOrder?:number; slug?:string }
export interface Lesson { id:string; moduleId:string; title:string; slug?:string; germanText?:string|null; englishText?:string|null; banglaText?:string|null; status:string; sortOrder?:number; estimatedMinutes?:number|null }
export interface VocabularyCategory { id:string; appId:string; name:string; banglaName?:string; isActive:boolean; sortOrder?:number }
export interface MediaAsset { publicUrl?:string | null }
export interface Vocabulary { id:string; appId:string; german:string; english:string; bangla?:string|null; article?:string|null; categoryId?:string|null; category?:{name:string}|null; exampleGerman?:string|null; exampleEnglish?:string|null; imageUrl?:string|null; audioUrl?:string|null; imageAsset?:MediaAsset|null; audioAsset?:MediaAsset|null; difficulty?:string|null; isPublished:boolean; status:string }
export interface Catalog { apps:LearnerApp[]; courses:Course[]; modules:CourseModule[]; lessons:Lesson[]; categories:VocabularyCategory[]; words:Vocabulary[] }
export function byOrder<T extends {sortOrder?:number}>(rows:T[]):T[]{return [...rows].sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));}
export function safeMediaUrl(url?:string|null):string {
  if(!url) return '';
  try { const parsed=new URL(url); return ['http:','https:'].includes(parsed.protocol)?parsed.href:''; } catch { return ''; }
}
export function speakGerman(text:string,audioUrl?:string|null):void {
  if(typeof window==='undefined') return;
  const fallback=()=>{
    if(!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(text); utterance.lang='de-DE'; utterance.rate=0.82;
    window.speechSynthesis.speak(utterance);
  };
  const safe=safeMediaUrl(audioUrl);
  if(safe){try{const audio=new Audio(safe);void audio.play().catch(fallback);return;}catch{/* use speech */}}
  fallback();
}
