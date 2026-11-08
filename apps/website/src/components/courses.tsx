'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useLearner} from './learner-provider';
import {Shell,Heading,LevelTabs,CourseCard,CourseArt,Empty,PercentRing} from './ui';
import {Icon} from './icon';
import {LEVEL_NAMES} from '@/lib/types';

export function Courses(){
 const learner=useLearner(); const [query,setQuery]=useState('');
 const courses=learner.courses.filter(c=>`${c.title} ${c.description||''}`.toLowerCase().includes(query.toLowerCase()));
 return <Shell title="My courses"><Heading eyebrow="YOUR LEARNING LIBRARY" title={<>Find your next <em>aha!</em> moment</>} desc="Curated bite-sized lessons that take you from your first Hallo to real conversations."/>
   <div className="library-toolbar"><LevelTabs/><div className="search-field"><Icon name="search" size={18}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search courses..." aria-label="Search courses"/></div></div>
   <div className="course-grid">{courses.length?courses.map((course,i)=><CourseCard key={course.id} course={course} index={i}/>):<Empty title="No courses found">Try another search or choose another German level.</Empty>}</div>
 </Shell>;
}
export function CourseDetails({id}:{id:string}){
 const learner=useLearner();const course=learner.courses.find(c=>c.id===id);
 if(!course)return <Shell title="My courses"><Heading eyebrow="COURSE LIBRARY" title="Course unavailable"/><Link className="button button-primary" href="/courses">Back to courses <Icon name="arrow" size={17}/></Link></Shell>;
 const modules=learner.modulesFor(id),lessons=learner.lessonsForCourse(id),p=learner.courseProgress(id),next=lessons.find(l=>!learner.completed[l.id])||lessons[0];
 const nextHref=next?`/lessons/${encodeURIComponent(next.id)}`:'/courses';
 return <Shell title="Course details"><Link href="/courses" className="back-link"><Icon name="left" size={18}/> Back to courses</Link>
   <div className="course-hero"><div className="course-hero-copy"><div className="hero-crumb">{learner.level} · {LEVEL_NAMES[learner.level].toUpperCase()} · {modules.length} MODULES</div><h1>{course.title}</h1><p>{course.description||'Build your German skills one lesson at a time.'}</p><div className="course-hero-actions"><Link className="button button-light" href={nextHref}>{p?'Continue course':'Start course'} <Icon name="arrow" size={18}/></Link><span><Icon name="clock" size={17}/> {lessons.reduce((sum,l)=>sum+(l.estimatedMinutes||5),0)} min total</span></div></div><CourseArt index={learner.courses.indexOf(course)} big/></div>
   <div className="detail-split"><div><div className="section-head"><div><div className="eyebrow">STEP BY STEP</div><h2>Course curriculum</h2></div><span className="lesson-tally">{lessons.filter(l=>learner.completed[l.id]).length}/{lessons.length} lessons done</span></div>
    {modules.length?modules.map((module,i)=><div className="module-card" key={module.id}><div className="module-heading"><div className="module-index">{String(i+1).padStart(2,'0')}</div><div><div className="mini-level">MODULE {i+1}</div><h3>{module.title}</h3><p>{module.description||'Build your skills through short lessons.'}</p></div><span className="module-count">{learner.lessonsFor(module.id).length} lessons</span></div><div className="module-lessons">{learner.lessonsFor(module.id).length?learner.lessonsFor(module.id).map((l,j)=><Link href={`/lessons/${encodeURIComponent(l.id)}`} className="lesson-row" key={l.id}><span className={`lesson-row-icon ${learner.completed[l.id]?'complete':''}`}><Icon name={learner.completed[l.id]?'check':'play'} size={15}/></span><span><strong>{l.title}</strong><small><Icon name="clock" size={13}/> {l.estimatedMinutes||5} min · Lesson {j+1}</small></span><span className="lesson-row-chevron"><Icon name="right" size={19}/></span></Link>):<Empty title="Lessons coming soon">Publish lessons in this module to show them here.</Empty>}</div></div>):<Empty title="Modules coming soon" icon="layers">Publish modules and lessons in Admin CMS.</Empty>}</div>
    <aside className="course-side"><div className="course-side-card"><div className="eyebrow">YOUR COURSE PROGRESS</div><PercentRing percent={p}/><div className="course-side-progress">{lessons.filter(l=>learner.completed[l.id]).length} of {lessons.length} lessons completed</div><p>Learning is a journey. You&apos;re exactly where you need to be.</p><Link className="button button-primary button-full" href={nextHref}>Keep learning <Icon name="arrow" size={17}/></Link></div><div className="side-tip"><Icon name="spark" size={22}/><div><strong>Did you know?</strong><p>Practising for 10 minutes consistently makes new words easier to remember.</p></div></div></aside>
   </div>
 </Shell>;
}
