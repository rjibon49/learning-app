'use client';
import {useState} from 'react';
import {useLearner} from './learner-provider';
import {Shell,Heading,ProgressBar,Empty} from './ui';
import {Icon} from './icon';
import {speakGerman,type Vocabulary} from '@/lib/types';

type Question={word:string;article?:string|null;correct:string;choices:string[]};
interface Quiz { questions:Question[]; index:number; selected:number|null; answers:boolean[]; finished:boolean }
const shuffle=<T,>(items:T[]):T[]=>{
  const arr=[...items];
  for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
  return arr;
};
export function makeQuestions(words:Vocabulary[]):Question[]{
  const valid=words.filter(w=>w.german&&w.english);
  return shuffle(valid).slice(0,10).map(w=>{
    const distractors=shuffle([...new Set(valid.filter(x=>x.id!==w.id&&x.english!==w.english).map(x=>x.english))]).slice(0,3);
    return {word:w.german,article:w.article,correct:w.english,choices:shuffle([...distractors,w.english])};
  }).filter(q=>q.choices.length>=2);
}
export function Practice(){
  const learner=useLearner();const [quiz,setQuiz]=useState<Quiz|null>(null);
  const start=()=>setQuiz({questions:makeQuestions(learner.words),index:0,selected:null,answers:[],finished:false});
  const next=()=>{
    if(!quiz||quiz.selected===null)return;
    const current=quiz.questions[quiz.index];
    const answers=[...quiz.answers,current.choices[quiz.selected]===current.correct];
    const finished=quiz.index===quiz.questions.length-1;
    if(finished)learner.setQuizBest(Math.round(100*answers.filter(Boolean).length/answers.length));
    setQuiz({...quiz,answers,finished,index:finished?quiz.index:quiz.index+1,selected:null});
  };
  const q=quiz&&!quiz.finished?quiz.questions[quiz.index]:null;
  const score=quiz&&quiz.answers.length?Math.round(100*quiz.answers.filter(Boolean).length/quiz.answers.length):0;
  return <Shell title="Practice zone"><Heading eyebrow="PRACTICE MAKES PROGRESS" title={<>A little practice, <em>a lot of growth.</em></>} desc="Turn what you learned into something you remember."/>
    <div className="practice-layout"><div className="quiz-panel">
      {!quiz||quiz.questions.length<2?<div className="quiz-intro"><div className="quiz-mascot">✳</div><div className="eyebrow">READY, SET, LEARN</div><h2>Let&apos;s see what<br/>you remember!</h2><p>Take a short, friendly quiz using published vocabulary for your current level. No pressure, just progress.</p><div className="quiz-info"><span><Icon name="cards" size={17}/> Up to 10 words</span><span><Icon name="clock" size={17}/> About 3 minutes</span><span><Icon name="star" size={17}/> Learn by doing</span></div>{learner.words.filter(w=>w.german&&w.english).length>1?<button className="button button-primary button-big" onClick={start}>Start practice <Icon name="arrow" size={18}/></button>:<Empty title="Not enough words yet" icon="vocab">Publish at least two vocabulary words to enable a practice quiz.</Empty>}</div>
      :quiz.finished?<div className="quiz-finish"><div className="result-confetti">✷ ✦ ✳</div><div className="score-medal"><Icon name="trophy" size={43}/></div><div className="eyebrow">NICE WORK!</div><h2>You got {quiz.answers.filter(Boolean).length} out of {quiz.answers.length} right!</h2><p>{score}% of your answers were correct. Every attempt brings you closer to fluency.</p><div className="result-progress"><ProgressBar value={score}/></div><button className="button button-primary" onClick={start}>Practice again <Icon name="refresh" size={18}/></button></div>
      :q&&<div className="quiz-active"><div className="quiz-top"><span>QUESTION {quiz.index+1} OF {quiz.questions.length}</span><span><Icon name="target" size={17}/> {quiz.answers.filter(Boolean).length} correct so far</span></div><ProgressBar value={(quiz.index+1)/quiz.questions.length*100}/><div className="eyebrow quiz-subtitle">CHOOSE THE CORRECT ENGLISH MEANING</div><h2>What does <em>“{q.article?`${q.article} `:''}{q.word}”</em> mean?</h2><button className="quiz-sound" onClick={()=>speakGerman(q.word)}><Icon name="sound" size={19}/> Hear the word</button>
        <div className="quiz-options">{q.choices.map((option,i)=><button key={i} disabled={quiz.selected!==null} onClick={()=>setQuiz(prev=>prev?{...prev,selected:i}:prev)} className={`quiz-option ${quiz.selected===i?'picked':''} ${quiz.selected!==null&&option===q.correct?'correct':''} ${quiz.selected===i&&option!==q.correct?'wrong':''}`}><span className="option-letter">{'ABCD'[i]}</span>{option}<span className="answer-indicator">{quiz.selected!==null&&option===q.correct&&<Icon name="check" size={20}/>}</span></button>)}</div>
        {quiz.selected!==null&&<div className="quiz-feedback">{q.choices[quiz.selected]===q.correct?'✓ That’s right! Sehr gut!':`The right answer is ${q.correct}. Keep going!`}</div>}
        <div className="quiz-bottom"><span>You&apos;ll learn something either way.</span><button className="button button-primary" disabled={quiz.selected===null} onClick={next}>{quiz.index===quiz.questions.length-1?'See results':'Next question'} <Icon name="arrow" size={17}/></button></div>
       </div>}
      </div><aside className="practice-side"><div className="practice-side-graphic">✦</div><div className="eyebrow">A GENTLE REMINDER</div><h3>Don&apos;t aim for perfect. Aim for progress.</h3><p>Making mistakes is part of learning. Showing up is what matters.</p><div className="side-divider"/><div className="practice-metric"><Icon name="trophy" size={20}/> Best session <strong>{learner.quizBest}%</strong></div><div className="practice-metric"><Icon name="vocab" size={20}/> Available words <strong>{learner.words.length}</strong></div><p className="side-disclaimer">Practice questions are generated from published vocabulary. CMS quizzes are admin-only in the supplied API.</p></aside>
    </div>
  </Shell>;
}
