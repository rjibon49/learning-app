'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useState,type ReactNode,type CSSProperties} from 'react';
import {Icon} from './icon';
import {useLearner} from './learner-provider';
import {LEVELS,LEVEL_NAMES,type Course} from '@/lib/types';

const navItems:[string,string,string][]= [
  ['home','My dashboard','/dashboard'], ['book','My courses','/courses'], ['vocab','Vocabulary','/vocabulary'],
  ['cards','Flashcards','/flashcards'], ['quiz','Practice zone','/practice'],
];
const secondary:[string,string,string][]=[['chart','My progress','/progress'],['info','About Wortly','/about']];
function NavItem({item,onNavigate}:{item:[string,string,string];onNavigate:()=>void}) {
  const path=usePathname();const [icon,label,href]=item;
  const active=href==='/'?path==='/':path===href||path.startsWith(href+'/');
  return <Link href={href} onClick={onNavigate} className={`nav-item ${active?'active':''}`}>
    <Icon name={icon} size={19}/><span>{label}</span>{active&&<span className="nav-dot"/>}
  </Link>;
}
export function Shell({title,children}:{title:string;children:ReactNode}){
  const [open,setOpen]=useState(false);const learner=useLearner();const router=useRouter();
  const close=()=>setOpen(false);
  const continueLearning=()=>{const lesson=learner.lessons.find(l=>!learner.completed[l.id])||learner.lessons[0];router.push(lesson?`/lessons/${encodeURIComponent(lesson.id)}`:'/courses');close();};
  return <div className="app-shell">
    <aside className={`sidebar ${open?'open':''}`}>
      <div className="sidebar-brand"><Link href="/" onClick={close} className="brand-link"><div className="brand-mark">w<span className="brand-spark">✦</span></div><span className="brand-name">wortly<span className="brand-period">.</span></span></Link><button className="sidebar-close icon-button" onClick={close} aria-label="Close menu"><Icon name="close" size={21}/></button></div>
      <div className="sidebar-scroll">
        <div className="nav-heading">LEARN</div><nav className="nav-group">{navItems.map(item=><NavItem key={item[2]} item={item} onNavigate={close}/>)}</nav>
        <div className="nav-heading nav-heading-secondary">YOUR SPACE</div><nav className="nav-group">{secondary.map(item=><NavItem key={item[2]} item={item} onNavigate={close}/>)}</nav>
        <div className="sidebar-promo"><div className="promo-star">✳</div><div className="promo-heading">Little steps,<br/>big progress.</div><p>Just 10 minutes a day can take you so far.</p><button className="promo-button" onClick={continueLearning}>Let&apos;s learn <Icon name="arrow" size={15}/></button></div>
      </div>
      <div className="sidebar-bottom"><div className="profile-avatar">L</div><div className="profile-meta"><strong>Language explorer</strong><span>{learner.level} · {LEVEL_NAMES[learner.level]}</span></div><span className="online-dot"/></div>
    </aside>
    {open&&<button className="mobile-overlay" onClick={close} aria-label="Close menu"/>}
    <div className="main-wrap">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={()=>setOpen(true)} aria-label="Open menu"><Icon name="menu" size={24}/></button><div className="page-eyebrow">WORTLY / {title.toUpperCase()}</div></div>
        <div className="topbar-right"><button className="top-search" onClick={()=>router.push('/vocabulary')} aria-label="Search vocabulary"><Icon name="search" size={17}/><span>Search vocabulary</span><kbd>⌕</kbd></button><div className="header-divider"/><div className="language-chip"><span className="flag-de"/><span>German</span><Icon name="chevron" size={13}/></div><span className="avatar" title="Local learner profile">L</span></div>
      </header>
      <main className="main-content">
        {learner.loading&&<div className="demo-strip"><Icon name="refresh" size={16}/> Loading courses and vocabulary from your API…</div>}
        {!learner.loading&&learner.demo&&<div className="demo-strip"><Icon name="info" size={16}/><strong>Preview mode</strong> · Your API is unavailable, so this screen uses sample learning content. <button onClick={()=>void learner.retry()}><Icon name="refresh" size={15}/> Retry API</button></div>}
        {children}
      </main>
    </div>
  </div>;
}
export function Heading({eyebrow,title,desc,action}:{eyebrow:string;title:ReactNode;desc?:ReactNode;action?:ReactNode}){
  return <div className="section-title-row"><div><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1>{desc&&<p className="page-description">{desc}</p>}</div>{action}</div>;
}
export function Empty({title,children,icon='book'}:{title:string;children:string;icon?:string}){
  return <div className="empty-state"><div className="empty-icon"><Icon name={icon} size={27}/></div><h3>{title}</h3><p>{children}</p></div>;
}
export function ProgressBar({value,small=false}:{value:number;small?:boolean}){
  return <div className={`progress-track ${small?'progress-track-sm':''}`}><div className="progress-fill" style={{width:`${Math.min(100,Math.max(0,value))}%`}}/></div>;
}
const art=[['ä','✳'],['Hallo!','✦'],['der','◌'],['DE','✺'],['W','✳'],['ß','✦']];
const colors=['peach','mint','lavender','sky','yellow','pink'];
export function CourseArt({index=0,big=false}:{index?:number;big?:boolean}){
  const [text,mark]=art[index%6];
  return <div className={`course-art ${colors[index%6]} ${big?'course-art-big':''}`}><div className="art-orbit"/><div className="art-type"><span>{text}</span><i>{mark}</i></div><div className="art-swoosh"/></div>;
}
export function LevelTabs(){const {level,setLevel,catalog}=useLearner();return <div className="level-tabs">{LEVELS.map(l=><button key={l} className={`level-tab ${level===l?'selected':''}`} disabled={!catalog.apps.some(a=>a.level===l)} onClick={()=>setLevel(l)}>{l}<span>{LEVEL_NAMES[l]}</span></button>)}</div>;}
export function CourseCard({course,index}:{course:Course;index:number}){
  const {level,modulesFor,lessonsForCourse,courseProgress}=useLearner();
  const modules=modulesFor(course.id),lessons=lessonsForCourse(course.id),pct=courseProgress(course.id);
  return <Link href={`/courses/${encodeURIComponent(course.id)}`} className="course-card"><div className="course-card-top"><CourseArt index={index}/><div className="course-card-body"><div className="mini-level">{level} · {LEVEL_NAMES[level]}</div><h3>{course.title}</h3><p>{course.description||'Discover a new chapter in your German journey.'}</p></div></div><div className="course-card-bottom"><div className="course-metadata"><Icon name="layers" size={15}/> {modules.length} modules <span className="small-dot">·</span> {lessons.length} lessons</div><div className="course-progress-row"><span>{pct>0?`${pct}% completed`:'Ready to begin'}</span><span className="card-arrow"><Icon name="arrow" size={17}/></span></div><ProgressBar value={pct} small/></div></Link>;
}
export function PercentRing({percent}:{percent:number}) {return <div className="ring-progress" style={{'--progress':`${percent}%`} as CSSProperties}><div><strong>{percent}%</strong><span>complete</span></div></div>;}
