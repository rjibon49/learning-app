'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useLearner} from './learner-provider';
import {Shell,ProgressBar,CourseArt,Empty} from './ui';
import {Icon} from './icon';
import {LEVELS,LEVEL_NAMES,speakGerman} from '@/lib/types';

export function Overview(){
  const learner=useLearner();const router=useRouter();
  const {courses,words,lessons,level,completed,courseProgress,lessonsForCourse}=learner;
  const featured=courses.find(c=>courseProgress(c.id)>0&&courseProgress(c.id)<100)||courses[0];
  const next=featured&&(lessonsForCourse(featured.id).find(l=>!completed[l.id])||lessonsForCourse(featured.id)[0]);
  const word=words.length?words[Math.floor(Date.now()/86400000)%words.length]:null;
  const start=()=>router.push(next?`/lessons/${encodeURIComponent(next.id)}`:featured?`/courses/${encodeURIComponent(featured.id)}`:'/courses');
  return <Shell title="Overview">
    <div className="welcome-header"><div className="welcome-greeting">GUTEN TAG! <span>✦</span> READY FOR TODAY?</div><div className="welcome-line"><div><h1>Every word gets you<br/><em>a little further.</em></h1><p>Your German journey, one small win at a time.</p></div><div className="today-pill"><Icon name="spark" size={17}/> Make today count</div></div></div>
    <section className="hero-card"><div className="hero-noise"/><div className="hero-copy"><div className="hero-overline">YOUR DAILY MOTIVATION <span>✳</span></div><h2>Hallo, future<br/><i>German speaker!</i></h2><p>You&apos;re building something brilliant. Keep showing up — even the tiniest lesson counts.</p><button className="button button-light" onClick={start}>Continue learning <Icon name="arrow" size={19}/></button></div>
      <div className="hero-illustration" aria-hidden="true"><div className="hero-orbit hero-orbit-one"/><div className="hero-orbit hero-orbit-two"/><div className="hero-word-card"><span className="word-card-label">YOUR NEXT WORD</span><strong>Wunderbar<span>!</span></strong><small>/ˈvʊndɐbaːɐ̯/</small><div className="hero-word-translation">wonderful ✳</div></div><div className="hero-deco-star star-one">✷</div><div className="hero-deco-star star-two">✳</div><div className="hero-deco-dot"/></div>
    </section>
    <div className="stat-grid">
      <div className="stat-card"><div className="stat-icon stat-fire"><Icon name="flame" size={24}/></div><div><div className="stat-label">Lessons completed</div><div className="stat-number">{learner.completedCount}<span> / {lessons.length}</span></div></div><span className="stat-decoration">↗</span></div>
      <div className="stat-card"><div className="stat-icon stat-book"><Icon name="book" size={23}/></div><div><div className="stat-label">Words mastered</div><div className="stat-number">{learner.learnedCount}<span> / {words.length}</span></div></div><span className="stat-decoration">✦</span></div>
      <div className="stat-card"><div className="stat-icon stat-star"><Icon name="target" size={23}/></div><div><div className="stat-label">Your current level</div><div className="stat-number">{level}<span> {LEVEL_NAMES[level]}</span></div></div><span className="stat-decoration">✳</span></div>
    </div>
    <section className="content-grid"><div className="left-content">
      <div className="section-head"><div><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2>Continue your journey <span className="title-star">✴</span></h2></div><Link href="/courses" className="text-link">All courses <Icon name="arrow" size={16}/></Link></div>
      {featured?<div className="continue-card"><div className="continue-image"><CourseArt index={0} big/></div><div className="continue-details"><div className="course-small-tag"><span className="tag-dot"/> {level} · ACTIVE COURSE</div><h3>{featured.title}</h3><p>{featured.description||'Your next step in learning German starts here.'}</p><div className="continue-meta"><span><Icon name="book" size={15}/> {lessonsForCourse(featured.id).length} lessons</span><span><Icon name="clock" size={15}/> Bite-sized sessions</span></div><div className="continue-bottom"><ProgressBar value={courseProgress(featured.id)}/><span>{courseProgress(featured.id)}%</span><Link className="round-go" aria-label="Continue course" href={next?`/lessons/${encodeURIComponent(next.id)}`:`/courses/${encodeURIComponent(featured.id)}`}><Icon name="arrow" size={20}/></Link></div></div></div>:<Empty title="No published courses yet">Publish a course in your Admin CMS to see it here.</Empty>}
      <div className="section-head section-gap"><div><div className="eyebrow">YOUR LEARNING PATH</div><h2>Explore the levels <span className="title-star">✳</span></h2></div></div>
      <div className="level-cards">{LEVELS.map((l,i)=><button key={l} className={`level-card level-color-${i} ${level===l?'current':''}`} disabled={!learner.catalog.apps.some(a=>a.level===l)} onClick={()=>learner.setLevel(l)}><span className="level-head"><span>{l}</span><Icon name="arrow" size={17}/></span><strong>{LEVEL_NAMES[l]}</strong><span className="level-sub">{['Start speaking','Build confidence','Find your voice','Go further','Master the nuance'][i]}</span><span className="level-bubble">{['Aa','Bb','Cc','Dd','Ee'][i]}</span></button>)}</div>
    </div><aside className="right-content"><div className="daily-card"><div className="daily-top"><span className="daily-icon">✦</span><span>THE DAILY WORD</span><span className="daily-date">Today</span></div>{word?<><div className="daily-word">{word.article?`${word.article} `:''}{word.german}</div><div className="daily-meaning">{word.english}</div><div className="daily-bangla">{word.bangla}</div><div className="daily-line"/><p>{word.exampleGerman||'Every word you learn is a step forward.'}</p><button className="daily-sound" onClick={()=>speakGerman(word.german,word.audioUrl||word.audioAsset?.publicUrl)}><Icon name="sound" size={17}/> Listen to pronunciation</button></>:<Empty title="Your word is coming" icon="vocab">Publish vocabulary to see a new word every day.</Empty>}</div>
      <div className="habit-card"><div className="habit-orbit"/><div className="habit-star">✴</div><div className="eyebrow">QUICK PRACTICE</div><h3>Five minutes.<br/>A brighter brain.</h3><p>Keep your words fresh with a quick round of practice.</p><Link href="/practice" className="habit-action">Start a quick quiz <Icon name="arrow" size={17}/></Link></div></aside></section>
  </Shell>;
}
