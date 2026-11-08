'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {demoCatalog,getPublicCatalog} from '@/lib/catalog';
import {byOrder,LEVELS,type Catalog,type Level,type Course,type Lesson,type Vocabulary,type CourseModule} from '@/lib/types';

type Flags=Record<string,boolean>;
const KEY='wortly-learner-v1'; // same key as the previous website; saved progress survives migration.
interface LearnerContextValue {
  catalog:Catalog; loading:boolean; demo:boolean; error:string; retry:()=>Promise<void>;
  level:Level; setLevel:(level:Level)=>void;
  learned:Flags; completed:Flags; lastLesson:string|null; quizBest:number;
  toggleLearned:(id:string)=>void; toggleCompleted:(id:string)=>void; rememberLesson:(id:string)=>void;
  setQuizBest:(value:number)=>void;
  appId:string|null; courses:Course[]; words:Vocabulary[]; lessons:Lesson[];
  modulesFor:(courseId:string)=>CourseModule[]; lessonsFor:(moduleId:string)=>Lesson[]; lessonsForCourse:(courseId:string)=>Lesson[];
  courseProgress:(courseId:string)=>number; learnedCount:number; completedCount:number;
}
const Context=createContext<LearnerContextValue|null>(null);
export function LearnerProvider({children}:{children:import('react').ReactNode}){
  const [catalog,setCatalog]=useState<Catalog>({apps:[],courses:[],modules:[],lessons:[],categories:[],words:[]});
  const [loading,setLoading]=useState(true);
  const [demo,setDemo]=useState(false);
  const [error,setError]=useState('');
  const [level,setLevel]=useState<Level>('A1');
  const [learned,setLearned]=useState<Flags>({});
  const [completed,setCompleted]=useState<Flags>({});
  const [lastLesson,setLastLesson]=useState<string|null>(null);
  const [quizBest,setQuizBestState]=useState(0);
  const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{
    try {
      const saved=JSON.parse(localStorage.getItem(KEY)||'{}') as {level?:Level;learned?:Flags;completed?:Flags;lastLesson?:string;quizBest?:number};
      if(saved.level&&LEVELS.includes(saved.level)) setLevel(saved.level);
      if(saved.learned&&typeof saved.learned==='object') setLearned(saved.learned);
      if(saved.completed&&typeof saved.completed==='object') setCompleted(saved.completed);
      if(typeof saved.lastLesson==='string') setLastLesson(saved.lastLesson);
      if(typeof saved.quizBest==='number'&&Number.isFinite(saved.quizBest)) setQuizBestState(saved.quizBest);
    }catch{/* invalid stored data: start afresh */}
    setHydrated(true);
  },[]);
  useEffect(()=>{if(!hydrated)return;try{localStorage.setItem(KEY,JSON.stringify({level,learned,completed,lastLesson,quizBest}));}catch{/* storage may be disabled */}},[hydrated,level,learned,completed,lastLesson,quizBest]);
  const retry=useCallback(async()=>{
    setLoading(true);
    try {
      const rows=await getPublicCatalog();
      setCatalog(rows);setDemo(false);setError('');
      setLevel(previous=>rows.apps.some(a=>a.level===previous)?previous:rows.apps[0]?.level||'A1');
    }catch(e){setCatalog(demoCatalog);setDemo(true);setError(e instanceof Error?e.message:'API unavailable');}
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{void retry();},[retry]);
  const appId=catalog.apps.find(a=>a.level===level)?.id??null;
  const courses=useMemo(()=>catalog.courses.filter(c=>c.appId===appId&&c.status==='PUBLISHED'),[catalog,appId]);
  const words=useMemo(()=>catalog.words.filter(w=>w.appId===appId&&w.isPublished&&w.status==='PUBLISHED'),[catalog,appId]);
  const modulesFor=useCallback((courseId:string)=>byOrder(catalog.modules.filter(m=>m.courseId===courseId&&m.status==='PUBLISHED')),[catalog]);
  const lessonsFor=useCallback((moduleId:string)=>byOrder(catalog.lessons.filter(l=>l.moduleId===moduleId&&l.status==='PUBLISHED')),[catalog]);
  const lessonsForCourse=useCallback((courseId:string)=>modulesFor(courseId).flatMap(m=>lessonsFor(m.id)),[modulesFor,lessonsFor]);
  const lessons=useMemo(()=>courses.flatMap(c=>lessonsForCourse(c.id)),[courses,lessonsForCourse]);
  const courseProgress=useCallback((courseId:string)=>{const items=lessonsForCourse(courseId);return items.length?Math.round(100*items.filter(l=>completed[l.id]).length/items.length):0;},[lessonsForCourse,completed]);
  const toggleLearned=useCallback((id:string)=>setLearned(prev=>({...prev,[id]:!prev[id]})),[]);
  const toggleCompleted=useCallback((id:string)=>setCompleted(prev=>({...prev,[id]:!prev[id]})),[]);
  const rememberLesson=useCallback((id:string)=>setLastLesson(prev=>prev===id?prev:id),[]);
  const setQuizBest=useCallback((value:number)=>setQuizBestState(prev=>Math.max(prev,value)),[]);
  const value:LearnerContextValue={catalog,loading,demo,error,retry,level,setLevel,learned,completed,lastLesson,quizBest,toggleLearned,toggleCompleted,rememberLesson,setQuizBest,appId,courses,words,lessons,modulesFor,lessonsFor,lessonsForCourse,courseProgress,learnedCount:words.filter(w=>learned[w.id]).length,completedCount:lessons.filter(l=>completed[l.id]).length};
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLearner():LearnerContextValue {
  const context=useContext(Context);
  if(!context)throw new Error('useLearner must be called inside LearnerProvider');
  return context;
}
