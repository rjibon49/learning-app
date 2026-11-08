'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useLearner} from './learner-provider';
import {Shell,Heading} from './ui';
import {Icon} from './icon';
import {speakGerman} from '@/lib/types';

export function LessonDetails({id}:{id:string}){
  const learner=useLearner();const [language,setLanguage]=useState<'de'|'en'|'bn'>('de');
  const lesson=learner.catalog.lessons.find(l=>l.id===id&&l.status==='PUBLISHED');
  const module=lesson&&learner.catalog.modules.find(m=>m.id===lesson.moduleId&&m.status==='PUBLISHED');
  const course=module&&learner.courses.find(c=>c.id===module.courseId);
  const lessons=course?learner.lessonsForCourse(course.id):[];
  const index=lessons.findIndex(l=>l.id===id);
  const prev=lessons[index-1],next=lessons[index+1];
  const done=!!learner.completed[id];
  const rememberLesson=learner.rememberLesson;
  useEffect(()=>{if(lesson&&course)rememberLesson(id);},[id,lesson,course,rememberLesson]);
  if(!lesson||!module||!course)return <Shell title="Lesson"><Heading eyebrow="LESSON" title="Lesson unavailable"/><Link href="/courses" className="button button-primary">Explore courses</Link></Shell>;
  const reading=language==='de'?lesson.germanText:language==='en'?lesson.englishText:lesson.banglaText;
  return <Shell title="Lesson">
    <Link href={`/courses/${encodeURIComponent(course.id)}`} className="back-link"><Icon name="left" size={18}/> {course.title}</Link>
    <div className="lesson-page"><div className="lesson-main">
      <div className="lesson-header"><div className="eyebrow">{learner.level} / {module.title} / LESSON {index+1}</div><h1>{lesson.title}</h1><p>Slow down, read aloud, and let the words sink in.</p><div className="lesson-badges"><span><Icon name="clock" size={16}/> {lesson.estimatedMinutes||5} min</span><span><Icon name="book" size={16}/> Reading & listening</span><span><Icon name={done?'check':'spark'} size={16}/> {done?'Completed':'In progress'}</span></div></div>
      <div className="reader-card"><div className="reader-card-top"><span className="reader-label"><span className="reader-dot"/> READING PRACTICE</span><div className="reader-toggle">{([['de','Deutsch'],['en','English'],['bn','বাংলা']] as const).map(([code,label])=><button key={code} className={language===code?'active':''} onClick={()=>setLanguage(code)}>{label}</button>)}</div></div>
       <div className="reader-content"><span className="quote-mark">“</span><div className="reader-body">{reading||'Text for this language has not been added yet.'}</div></div>
       <div className="reader-foot"><div><div className="reader-foot-label">PRONUNCIATION PRACTICE</div><p>Listen, then repeat aloud.</p></div><button className="listen-button" onClick={()=>speakGerman(lesson.germanText||lesson.title)}><Icon name="sound" size={20}/> Listen in German</button></div>
      </div>
      <div className="translation-card"><div><div className="eyebrow">ENGLISH TRANSLATION</div><p>{lesson.englishText||'No English translation provided.'}</p></div><div><div className="eyebrow">বাংলা অনুবাদ</div><p>{lesson.banglaText||'বাংলা অনুবাদ এখনো যোগ করা হয়নি।'}</p></div></div>
      <div className="lesson-actions"><button className={`button ${done?'button-outlined':'button-primary'}`} onClick={()=>learner.toggleCompleted(id)}><Icon name="check" size={17}/> {done?'Mark incomplete':'Mark as complete'}</button><div className="lesson-nav">{prev&&<Link href={`/lessons/${encodeURIComponent(prev.id)}`} className="button button-outlined"><Icon name="left" size={17}/> Previous</Link>}{next?<Link href={`/lessons/${encodeURIComponent(next.id)}`} className="button button-primary">Next lesson <Icon name="arrow" size={17}/></Link>:<Link href={`/courses/${encodeURIComponent(course.id)}`} className="button button-primary">Back to course <Icon name="arrow" size={17}/></Link>}</div></div>
    </div><aside className="lesson-aside"><div className="aside-heading">IN THIS COURSE</div>{lessons.map((l,i)=><Link key={l.id} href={`/lessons/${encodeURIComponent(l.id)}`} className={`aside-lesson ${l.id===id?'current':''}`}><span className="aside-circle">{learner.completed[l.id]?<Icon name="check" size={14}/>:i+1}</span><span>{l.title}</span></Link>)}<div className="lesson-aside-tip"><Icon name="spark" size={17}/> You can revisit any lesson whenever you need a refresher.</div></aside>
    </div>
  </Shell>;
}
