'use client';
import Link from 'next/link';
import {useLearner} from './learner-provider';
import {Shell,Heading,ProgressBar,Empty} from './ui';
import {Icon} from './icon';
export function Progress(){
  const learner=useLearner();const {courses,words,lessons,completed,courseProgress,lessonsForCourse}=learner;
  const done=learner.completedCount,learned=learner.learnedCount,percentage=lessons.length?Math.round(100*done/lessons.length):0;
  const achievements:[string,string,string,boolean][]=[
    ['star','First steps','Complete your first lesson',done>=1],
    ['vocab','Word collector','Master 5 new words',learned>=5],
    ['trophy','Quiz whiz','Score 80% on a practice quiz',learner.quizBest>=80],
  ];
  return <Shell title="My progress">
    <Heading eyebrow="EVERY STEP IS A WIN" title={<>Look how far <em>you&apos;ve come.</em></>} desc="Your personal progress is saved on this device — keep showing up and watch it grow."/>
    <div className="progress-stats">
      <div className="progress-stat-card"><div className="progress-stat-label">COMPLETED LESSONS</div><div className="progress-stat-value">{done} <span>/ {lessons.length}</span></div><ProgressBar value={percentage}/><div className="progress-stat-caption">{percentage}% through your level</div></div>
      <div className="progress-stat-card"><div className="progress-stat-label">WORDS MASTERED</div><div className="progress-stat-value">{learned} <span>/ {words.length}</span></div><ProgressBar value={words.length?learned/words.length*100:0}/><div className="progress-stat-caption">Your personal vocabulary bank</div></div>
      <div className="progress-stat-card accent-stat"><div className="progress-stat-label">PERSONAL BEST QUIZ</div><div className="progress-stat-value">{learner.quizBest}<span>%</span></div><span className="stat-comet">✳</span><div className="progress-stat-caption">Keep practising, keep improving</div></div>
    </div>
    <div className="progress-two-col"><div className="progress-courses"><div className="section-head"><div><div className="eyebrow">KEEP UP THE MOMENTUM</div><h2>Course progress</h2></div></div>
      {courses.length?courses.map((c,i)=><Link href={`/courses/${encodeURIComponent(c.id)}`} className="progress-course-row" key={c.id}><div className={`progress-course-icon course-icon-${i%4}`}>{['Aa','✳','ß','✦'][i%4]}</div><div className="progress-course-content"><div><strong>{c.title}</strong><span>{courseProgress(c.id)}%</span></div><ProgressBar value={courseProgress(c.id)} small/><small>{lessonsForCourse(c.id).filter(l=>completed[l.id]).length} / {lessonsForCourse(c.id).length} lessons completed</small></div><Icon name="right" size={19}/></Link>):<Empty title="Nothing to track yet">Courses you publish will appear here.</Empty>}
    </div><div className="achievement-card"><div className="eyebrow">YOUR ACHIEVEMENTS</div><h2>Collect little wins</h2><p>Each milestone is worth celebrating.</p><div className="achievement-list">{achievements.map(([icon,title,caption,unlocked])=><div key={title} className={`achievement-item ${unlocked?'unlocked':''}`}><span className="achievement-icon"><Icon name={icon} size={22}/></span><div><strong>{title}</strong><small>{caption}</small></div><Icon name={unlocked?'check':'lock'} size={17}/></div>)}</div><div className="progress-footnote"><Icon name="info" size={16}/> Progress is stored locally in your browser, not synced with an account.</div></div></div>
  </Shell>;
}
