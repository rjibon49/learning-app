'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useLearner} from './learner-provider';
import {Shell,Heading,ProgressBar,Empty} from './ui';
import {Icon} from './icon';
import {speakGerman} from '@/lib/types';

export function Flashcards(){
  const learner=useLearner();const words=learner.words;
  const [index,setIndex]=useState(0);const [flipped,setFlipped]=useState(false);
  const activeIndex=words.length?index%words.length:0;
  const word=words[activeIndex];
  const navigate=(direction:number)=>{if(!words.length)return;setIndex(i=>(i+direction+words.length)%words.length);setFlipped(false);};
  useEffect(()=>{setIndex(0);setFlipped(false);},[learner.level]);
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      const tag=(document.activeElement?.tagName||'').toLowerCase();
      if(['input','textarea','select'].includes(tag))return;
      if(event.key==='ArrowLeft') navigate(-1);
      if(event.key==='ArrowRight') navigate(1);
      if(event.key===' ' && document.activeElement?.tagName!=='BUTTON'){event.preventDefault();setFlipped(f=>!f);}
    };
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  // Re-attach when the deck length changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[words.length]);
  return <Shell title="Flashcards">
    <Heading eyebrow="YOUR MEMORY GYM" title={<>Flip. Remember. <em>Repeat.</em></>} desc="Short flashcard sessions help your new words stick. Click or tap a card to reveal the meaning."/>
    <div className="flash-layout"><div className="flash-main">{word?<>
      <div className="flash-toolbar"><span>WORD {activeIndex+1} OF {words.length}</span><span>{learner.learnedCount} MASTERED</span></div>
      <ProgressBar value={(activeIndex+1)/words.length*100}/>
      <button className={`flashcard ${flipped?'flipped':''}`} onClick={()=>setFlipped(f=>!f)} aria-label="Flip flashcard"><div className="flash-glimmer flash-glimmer-one"/><div className="flash-glimmer flash-glimmer-two"/><div className="flash-category">{flipped?'THE MEANING':'WHAT DOES THIS MEAN?'}</div><div className="flash-word">{flipped?word.english:<>{word.article&&<small>{word.article} </small>}{word.german}</>}</div><div className="flash-subword">{flipped?word.bangla:`German · ${learner.level}`}</div><div className="flash-hint"><Icon name="refresh" size={17}/> Tap to flip</div></button>
      <div className="flash-controls"><button className="flash-circle" aria-label="Previous card" onClick={()=>navigate(-1)}><Icon name="left" size={22}/></button><button className="listen-button flash-audio" onClick={()=>speakGerman(word.german,word.audioUrl||word.audioAsset?.publicUrl)}><Icon name="sound" size={19}/> Listen</button><button className="flash-circle" aria-label="Next card" onClick={()=>navigate(1)}><Icon name="right" size={22}/></button></div>
      <div className="flash-mastery"><button className={`button ${learner.learned[word.id]?'button-outlined':'button-primary'}`} onClick={()=>learner.toggleLearned(word.id)}><Icon name="check" size={17}/> {learner.learned[word.id]?'Already mastered ✓':'I know this word'}</button><span>Use ← → to switch cards</span></div>
    </>:<Empty title="Your flashcard deck is empty" icon="cards">Published vocabulary in this level will become flashcards automatically.</Empty>}</div>
      <aside className="flash-side"><div className="flash-side-head"><div className="eyebrow">MY WORDS</div><h3>Keep it going!</h3><p>Every new word is a new little victory.</p></div><div className="flash-side-bubble">✳</div><div className="flash-stat"><strong>{learner.learnedCount}</strong><span>Words mastered</span></div><ProgressBar value={words.length?learner.learnedCount/words.length*100:0}/><div className="flash-small-note"><Icon name="info" size={17}/> Your mastered words are saved on this device.</div><Link href="/vocabulary" className="button button-outlined button-full">Explore vocabulary <Icon name="arrow" size={16}/></Link></aside>
    </div>
  </Shell>;
}
