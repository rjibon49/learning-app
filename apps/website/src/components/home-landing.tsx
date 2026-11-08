'use client';

import Link from 'next/link';
import {useState} from 'react';
import {useLearner} from '@/components/learner-provider';
import {Icon} from '@/components/icon';
import {LEVELS,LEVEL_NAMES,speakGerman,type Level} from '@/lib/types';

type PreviewTab = 'learn' | 'review' | 'practice';

const features = [
  { icon:'book', title:'A roadmap, not random lessons', description:'Learn in a clear order, from foundational words and sentences to more confident everyday communication.', tone:'mint', tag:'STRUCTURED COURSES'},
  { icon:'globe', title:'English + Bangla support', description:'Make sense of new German expressions with English and Bangla explanations when included in the lesson.', tone:'peach', tag:'MADE TO UNDERSTAND'},
  { icon:'sound', title:'Hear the language', description:'Listen to German vocabulary with available audio or browser speech, then say the words out loud.', tone:'lavender', tag:'LISTEN & REPEAT'},
  { icon:'cards', title:'Flashcards that help words stick', description:'Turn your published vocabulary into simple cards and revisit words whenever you have a spare moment.', tone:'sky', tag:'ACTIVE RECALL'},
  { icon:'quiz', title:'Small quizzes, real practice', description:'Check what you remember with quick vocabulary questions and get feedback as you go.', tone:'butter', tag:'CHECK YOURSELF'},
  { icon:'chart', title:'See your own progress', description:'Keep track of completed lessons and learned words on this browser, so your next step is always clear.', tone:'rose', tag:'YOUR LEARNING SPACE'},
] as const;

const steps = [
  {num:'01',title:'Choose where you begin',body:'Start at your level. A1 is designed for first steps; later levels build on what you know.',icon:'target'},
  {num:'02',title:'Learn one focused lesson',body:'Follow a course, read the German, and use available English or Bangla translations to understand it.',icon:'book'},
  {num:'03',title:'Make words familiar',body:'Explore vocabulary, listen to pronunciation, and flip flashcards to recall meanings.',icon:'cards'},
  {num:'04',title:'Practice and keep going',body:'Try a short quiz, mark lessons complete, and return to pick up where you left off.',icon:'trophy'},
] as const;

const levels: {level:Level;message:string;highlight:string}[] = [
  {level:'A1',message:'Say hello, introduce yourself, and handle the basics.',highlight:'First conversations'},
  {level:'A2',message:'Talk about daily life, routines, and familiar situations.',highlight:'Everyday confidence'},
  {level:'B1',message:'Share opinions and handle more independent conversations.',highlight:'Find your voice'},
  {level:'B2',message:'Discuss ideas and understand more detailed German.',highlight:'Communicate with depth'},
  {level:'C1',message:'Work with more complex language and nuanced expression.',highlight:'Advanced expression'},
];

const faqs = [
  {q:'I am a complete beginner. Can I start here?',a:'Yes. A1 is the starting level of the learning path. Begin with a published A1 course, follow the lessons in order, then practise the vocabulary.'},
  {q:'Will I see Bangla explanations?',a:'Wortly supports German lessons and vocabulary with English and Bangla translations. What appears in a specific lesson depends on what has been published in the course CMS.'},
  {q:'How do the flashcards and quizzes work?',a:'The learner website creates review cards and short practice quizzes from published vocabulary. They are designed for recall and repetition, not an official proficiency test.'},
  {q:'Can I use Wortly on my phone?',a:'Yes. The learner website is designed for mobile, tablet and desktop screens. Your study progress is saved locally in the browser you use.'},
  {q:'Does my progress sync between devices?',a:'Not yet. At this stage, completed lessons and word progress are saved in this browser only. Learner accounts and cloud sync can be added in a later release.'},
];

function WordPreview(){
  const [tab,setTab]=useState<PreviewTab>('learn');
  const [flipped,setFlipped]=useState(false);
  const [selected,setSelected]=useState<number|null>(null);
  return <div className="lp-product-showcase" id="try-it">
    <div className="lp-section-intro lp-product-intro"><div><span className="lp-eyebrow"><span className="lp-eyebrow-dot"/> A LITTLE PREVIEW</span><h2>See what learning<br/><em>feels like.</em></h2></div><p>German, made more approachable. Try this example before you dive into a real lesson.</p></div>
    <div className="lp-preview-panel">
      <div className="lp-preview-aside"><div className="lp-preview-eyebrow"><Icon name="spark" size={15}/> INTERACTIVE SAMPLE</div><h3>Your study space,<br/>without the clutter.</h3><p>A focused place to learn, review and test yourself. Choose one of the modes to try it.</p>
        <div className="lp-preview-nav" role="tablist" aria-label="Learning mode preview">
          {([['learn','book','Learn a word'],['review','cards','Flip a flashcard'],['practice','quiz','Try a quick quiz']] as const).map(([id,icon,label])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon name={icon} size={19}/>{label}<Icon name="right" size={16}/></button>)}
        </div>
        <span className="lp-preview-note">Example content · not your live CMS lesson</span>
      </div>
      <div className="lp-preview-workspace" role="tabpanel">
        <div className="lp-workspace-top"><span><span className="lp-mini-dot"/> SAMPLE LESSON · A1</span><span>GERMAN <span aria-hidden="true">🇩🇪</span></span></div>
        {tab==='learn'&&<div className="lp-lesson-demo"><div className="lp-demo-label">TODAY&apos;S EXPRESSION</div><h3>Guten Morgen<span>!</span></h3><button type="button" className="lp-audio-button" onClick={()=>speakGerman('Guten Morgen')}><Icon name="sound" size={18}/> Hear pronunciation</button><div className="lp-translation"><div><span>ENGLISH</span><strong>Good morning!</strong></div><div><span>বাংলা</span><strong>সুপ্রভাত!</strong></div></div><div className="lp-demo-tip"><Icon name="spark" size={16}/> <span><strong>Little tip:</strong> Say it out loud twice. Small repetitions help.</span></div></div>}
        {tab==='review'&&<div className="lp-flip-demo"><span className="lp-demo-label">FLASHCARD · 01 OF 01</span><button type="button" className="lp-flip-card" aria-label="Flip flashcard" onClick={()=>setFlipped(v=>!v)}><span className="lp-demo-label">{flipped?'MEANING':'GERMAN'}</span><strong>{flipped?'Good morning!':'Guten Morgen!'}</strong><span>{flipped?'সুপ্রভাত!':'Tap to reveal the meaning'}</span><span className="lp-flip-icon"><Icon name="refresh" size={17}/></span></button><p>Try recalling the answer before you flip.</p></div>}
        {tab==='practice'&&<div className="lp-quiz-demo"><span className="lp-demo-label">QUESTION · 01 OF 01</span><h3>What does <em>“Guten Morgen”</em> mean?</h3><div className="lp-quiz-options">{['Good morning','Good night','Thank you'].map((option,i)=><button key={option} onClick={()=>setSelected(i)} className={selected===i?(i===0?'correct':'incorrect'):''}><span>{String.fromCharCode(65+i)}</span>{option}{selected===i&&<Icon name={i===0?'check':'close'} size={18}/>}</button>)}</div>{selected!==null&&<div className={`lp-quiz-feedback ${selected===0?'right':'try-again'}`}>{selected===0?'Exactly! Guten Morgen means “Good morning.”':'Not quite. The correct answer is “Good morning.”'}</div>}</div>}
        <div className="lp-workspace-bottom"><span><Icon name="lock" size={14}/> No sign-up needed for this preview</span><Link href="/courses">Open real lessons <Icon name="arrow" size={16}/></Link></div>
      </div>
    </div>
  </div>;
}

export function HomeLanding(){
  const learner=useLearner();
  const [menuOpen,setMenuOpen]=useState(false);
  const currentCourses=learner.courses.slice(0,3);
  const currentLevels=new Set(learner.catalog.apps.filter(a=>a.isActive && learner.catalog.courses.some(course=>course.appId===a.id && course.status==='PUBLISHED')).map(a=>a.level));
  const chooseLevel=(l:Level)=>{learner.setLevel(l);};
  const navLinks=[['Why Wortly','#why-wortly'],['How it works','#how-it-works'],['Levels','#levels'],['FAQs','#faqs']];
  return <div className="lp-site">
    <header className="lp-header"><div className="lp-container lp-header-inner">
      <Link href="/" className="lp-logo" aria-label="Wortly home"><span className="lp-logo-symbol">w<span>✳</span></span><span>wortly<span className="lp-logo-period">.</span></span></Link>
      <nav aria-label="Main navigation" className={`lp-nav ${menuOpen?'lp-nav-open':''}`}>{navLinks.map(([label,href])=><a key={href} href={href} onClick={()=>setMenuOpen(false)}>{label}</a>)}<Link className="lp-nav-mobile-action" href="/dashboard" onClick={()=>setMenuOpen(false)}>My dashboard</Link></nav>
      <div className="lp-header-actions"><Link href="/dashboard" className="lp-header-dashboard">My dashboard <Icon name="arrow" size={15}/></Link><Link href="/courses" className="lp-primary lp-header-cta">Start learning <Icon name="arrow" size={17}/></Link></div>
      <button type="button" className="lp-menu-toggle" aria-label={menuOpen?'Close navigation':'Open navigation'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}><Icon name={menuOpen?'close':'menu'} size={23}/></button>
    </div></header>

    <main>
      <section className="lp-hero"><div className="lp-hero-glow"/><div className="lp-container lp-hero-layout">
        <div className="lp-hero-copy"><div className="lp-hero-pill"><span className="lp-pill-star">✳</span> YOUR FRIENDLY GERMAN LEARNING SPACE</div><h1>Big dreams.<br/>Small lessons.<br/><span>Hallo, German!</span></h1><p className="lp-hero-description">A clearer, calmer way to learn German—from your first <strong>Hallo</strong> to more confident conversations. Follow guided lessons, understand words in English and Bangla, and practise a little every day.</p>
          <div className="lp-hero-buttons"><Link href="/courses" className="lp-primary lp-primary-large">Start your German journey <Icon name="arrow" size={19}/></Link><a className="lp-ghost" href="#how-it-works"><span className="lp-play-circle"><Icon name="play" size={16}/></span> See how it works</a></div>
          <div className="lp-hero-under"><div className="lp-avatar-stack"><span>Aa</span><span>ä</span><span>ß</span></div><div>Made for curious beginners <span aria-hidden="true">✦</span> Built to grow with you</div></div>
        </div>
        <div className="lp-hero-art" aria-label="Illustration of the Wortly learning interface">
          <div className="lp-hero-art-circle lp-circle-one"/><div className="lp-hero-art-circle lp-circle-two"/><div className="lp-art-spark lp-spark-one">✳</div><div className="lp-art-spark lp-spark-two">✦</div>
          <div className="lp-floating-sticker lp-sticker-top"><span>✦</span> one word at a time</div>
          <div className="lp-main-visual-card"><div className="lp-main-visual-top"><span><span className="lp-mini-dot"/> MY FIRST GERMAN LESSON</span><span>01 / 05</span></div><div className="lp-main-visual-icon">✳</div><span className="lp-card-topic">LET&apos;S SAY HELLO</span><div className="lp-german-word">Guten<br/><em>Tag!</em></div><div className="lp-visual-divider"/><div className="lp-card-translation"><span>English <strong>Good day!</strong></span><span>বাংলা <strong>শুভ দিন!</strong></span></div><div className="lp-visual-progress"><span/><span/><span/><span/><span/></div></div>
          <div className="lp-floating-sticker lp-sticker-bottom"><div className="lp-sticker-icon"><Icon name="check" size={22}/></div><div><strong>Nice work!</strong><small>Every word counts.</small></div></div>
          <div className="lp-art-doodle lp-doodle-one">Aa</div><div className="lp-art-doodle lp-doodle-two">ß</div>
        </div>
      </div><div className="lp-container lp-hero-bottom"><span>YOUR GERMAN LEARNING ROUTINE</span><div>LEARN <b>✳</b> RECALL <b>✳</b> PRACTISE <b>✳</b> GROW</div></div></section>

      <section id="why-wortly" className="lp-section lp-why"><div className="lp-container">
        <div className="lp-section-intro lp-why-head"><div><span className="lp-eyebrow"><span className="lp-eyebrow-dot"/> WHY WORTLY?</span><h2>Learning a language<br/>should <em>feel possible.</em></h2></div><p>Not another pile of random words. Wortly brings lessons, explanations and practice together—so you know what to study and what to do next.</p></div>
        <div className="lp-benefit-row"><div><span className="lp-benefit-icon"><Icon name="target" size={23}/></span><strong>A clear next step</strong><p>Stay focused with a course and lesson path.</p></div><div><span className="lp-benefit-icon"><Icon name="heart" size={23}/></span><strong>Less overwhelm</strong><p>Build confidence through small, doable sessions.</p></div><div><span className="lp-benefit-icon"><Icon name="spark" size={23}/></span><strong>More than memorising</strong><p>Learn, recall, practise and revisit vocabulary.</p></div></div>
        <div className="lp-feature-grid">{features.map((feature,index)=><article className={`lp-feature lp-feature-${feature.tone}`} key={feature.title}><div className="lp-feature-top"><span className="lp-feature-icon"><Icon name={feature.icon} size={26}/></span><span className="lp-feature-number">0{index+1}</span></div><div className="lp-feature-copy"><span className="lp-feature-tag">{feature.tag}</span><h3>{feature.title}</h3><p>{feature.description}</p></div><span className="lp-feature-decoration" aria-hidden="true">✳</span></article>)}</div>
      </div></section>

      <section className="lp-section lp-process" id="how-it-works"><div className="lp-container"><div className="lp-process-heading"><div><span className="lp-eyebrow"><span className="lp-eyebrow-dot"/> A SIMPLE WAY FORWARD</span><h2>How your German<br/><em>journey works.</em></h2></div><p>No complicated plan required. Your next lesson, vocabulary review and practice are always just a click away.</p></div>
        <div className="lp-steps">{steps.map((step,i)=><article key={step.num} className="lp-step"><div className="lp-step-number">{step.num}</div><span className={`lp-step-icon lp-step-icon-${i}`}><Icon name={step.icon} size={27}/></span><h3>{step.title}</h3><p>{step.body}</p>{i<3&&<span className="lp-step-link" aria-hidden="true">→</span>}</article>)}</div>
      </div></section>

      <section className="lp-section lp-roadmap" id="levels"><div className="lp-container"><div className="lp-section-intro"><div><span className="lp-eyebrow"><span className="lp-eyebrow-dot"/> YOUR ROADMAP</span><h2>Start at A1.<br/><em>See how far you go.</em></h2></div><p>A familiar A1–C1 progression gives you direction. Explore a level when its content is available from the CMS.</p></div>
        <div className="lp-roadmap-grid">{levels.map((item,i)=>{const available=currentLevels.has(item.level);return <article key={item.level} className={`lp-level-item lp-level-${i} ${learner.level===item.level?'lp-level-selected':''}`}><div className="lp-level-top"><span>LEVEL {String(i+1).padStart(2,'0')}</span><span className="lp-level-marker">{available&&item.level===learner.level?'YOUR LEVEL':available?'COURSES LIVE':'PLANNED PATH'}</span></div><div className="lp-level-glyph">{item.level}</div><h3>{LEVEL_NAMES[item.level]}</h3><p>{item.message}</p><div className="lp-level-bottom"><span>{item.highlight}</span>{available?<Link href="/courses" onClick={()=>chooseLevel(item.level)} aria-label={`Browse ${item.level} courses`}><Icon name="arrow" size={18}/></Link>:<span className="lp-level-disabled" aria-label="No published content for this level"><Icon name="lock" size={16}/></span>}</div></article>;})}</div>
        <p className="lp-level-footnote"><Icon name="info" size={16}/> Availability depends on the active levels and published lessons in your CMS. Levels shown as planned may not have courses yet.</p>
      </div></section>

      <section className="lp-section lp-preview-section"><div className="lp-container"><WordPreview/></div></section>

      <section className="lp-section lp-library"><div className="lp-container"><div className="lp-section-intro lp-library-intro"><div><span className="lp-eyebrow"><span className="lp-eyebrow-dot"/> READY WHEN YOU ARE</span><h2>Find your first<br/><em>course.</em></h2></div><div className="lp-library-intro-right"><p>Choose a level and explore lessons available in your learning library.</p><Link href="/courses" className="lp-outline-link">Browse all courses <Icon name="arrow" size={17}/></Link></div></div>
        {learner.demo&&<div className="lp-library-notice"><Icon name="info" size={17}/> Preview mode: showing example course content because the API is unavailable.</div>}
        <div className="lp-course-selector" aria-label="Select a course level">{LEVELS.map(l=><button key={l} className={l===learner.level?'selected':''} disabled={!currentLevels.has(l)} onClick={()=>chooseLevel(l)}>{l} <span>{LEVEL_NAMES[l]}</span></button>)}</div>
        {learner.loading?<div className="lp-course-empty">Loading published courses from the API…</div>:currentCourses.length?<div className="lp-landing-courses">{currentCourses.map((course,index)=><Link key={course.id} href={`/courses/${encodeURIComponent(course.id)}`} className="lp-landing-course"><div className={`lp-course-art lp-course-art-${index}`}><span>{learner.level}</span><strong>{['Hallo!','Wörter','Deutsch'][index]}</strong><span className="lp-art-mark">{['✳','✶','✦'][index]}</span></div><div className="lp-course-text"><span className="lp-course-kicker">{learner.level} COURSE</span><h3>{course.title}</h3><p>{course.description||'Discover the lessons in this course and begin learning step by step.'}</p><span className="lp-course-go">View course <Icon name="arrow" size={17}/></span></div></Link>)}</div>:<div className="lp-course-empty"><Icon name="book" size={27}/><strong>No published courses for this level yet</strong><span>Publish a course in your CMS, or explore the other available levels.</span></div>}
      </div></section>

      <section className="lp-section lp-faq" id="faqs"><div className="lp-container lp-faq-layout"><div className="lp-faq-lead"><span className="lp-eyebrow"><span className="lp-eyebrow-dot"/> GOOD TO KNOW</span><h2>Curious?<br/><em>We get it.</em></h2><p>A few answers to help you start with confidence.</p><div className="lp-faq-smile" aria-hidden="true">:)</div></div><div className="lp-faq-items">{faqs.map((faq,i)=><details key={faq.q} open={i===0}><summary>{faq.q}<span><Icon name="chevron" size={19}/></span></summary><p>{faq.a}</p></details>)}</div></div></section>

      <section className="lp-last-cta"><div className="lp-container"><div className="lp-cta-card"><span className="lp-cta-sun">✺</span><div><span className="lp-eyebrow">YOUR FIRST STEP IS THE BEST ONE</span><h2>A little German today.<br/><em>A lot more possible tomorrow.</em></h2><p>Pick a level, open a lesson and start. You don&apos;t have to be perfect—just curious.</p><div className="lp-cta-actions"><Link className="lp-primary lp-primary-large" href="/courses">Explore the courses <Icon name="arrow" size={19}/></Link><Link className="lp-cta-text" href="/dashboard">Go to my dashboard <Icon name="right" size={17}/></Link></div></div><div className="lp-cta-graphic" aria-hidden="true"><div className="lp-cta-bubble">Hallo!</div><div className="lp-cta-letter">W</div><span>✳</span></div></div></div></section>
    </main>

    <footer className="lp-footer"><div className="lp-container"><div className="lp-footer-grid"><div><Link href="/" className="lp-logo"><span className="lp-logo-symbol">w<span>✳</span></span><span>wortly<span className="lp-logo-period">.</span></span></Link><p>Small lessons. Big language dreams.<br/>A more welcoming way to learn German.</p></div><div><strong>LEARN</strong><Link href="/courses">Courses</Link><Link href="/vocabulary">Vocabulary</Link><Link href="/flashcards">Flashcards</Link><Link href="/practice">Practice quiz</Link></div><div><strong>EXPLORE</strong><Link href="/dashboard">Dashboard</Link><Link href="/progress">My progress</Link><Link href="/about">About Wortly</Link><a href="#how-it-works">How it works</a></div><div className="lp-footer-right"><span className="lp-footer-sun">✳</span><p>Made for a little learning,<br/>every single day.</p></div></div><div className="lp-footer-bottom"><span>© {new Date().getFullYear()} Wortly · A German learning experience</span><span>Learn at your pace <span aria-hidden="true">✦</span> Schritt für Schritt.</span></div></div></footer>
  </div>;
}
