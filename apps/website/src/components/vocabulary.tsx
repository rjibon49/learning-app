'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {useLearner} from './learner-provider';
import {Shell,Heading,Empty} from './ui';
import {Icon} from './icon';
import {LEVEL_NAMES,safeMediaUrl,speakGerman} from '@/lib/types';
export function Vocabulary(){
  const learner=useLearner();const [query,setQuery]=useState('');const [category,setCategory]=useState('all');const [page,setPage]=useState(1);
  const cats=learner.catalog.categories.filter(c=>c.appId===learner.appId&&c.isActive);
  const filtered=useMemo(()=>learner.words.filter(w=>(category==='all'||w.categoryId===category)&&[w.german,w.english,w.bangla,w.article].some(field=>(field||'').toLowerCase().includes(query.toLowerCase()))),[learner.words,category,query]);
  const shown=filtered.slice(0,page*12);
  return <Shell title="Vocabulary">
    <Heading eyebrow="MAKE WORDS YOUR SUPERPOWER" title={<>Words worth <em>remembering.</em></>} desc="Explore German words with English and বাংলা meanings. Tap the speaker icon to hear them out loud." action={<Link href="/flashcards" className="button button-primary">Study flashcards <Icon name="arrow" size={18}/></Link>}/>
    <div className="vocab-toolbar"><div className="category-pills"><button className={`category-pill ${category==='all'?'active':''}`} onClick={()=>{setCategory('all');setPage(1);}}>All words <span>{learner.words.length}</span></button>{cats.map(c=><button key={c.id} className={`category-pill ${category===c.id?'active':''}`} onClick={()=>{setCategory(c.id);setPage(1);}}>{c.name}</button>)}</div>
      <div className="search-field"><Icon name="search" size={18}/><input id="vocab-search" type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} placeholder="Search German, English, বাংলা..." aria-label="Search vocabulary"/></div>
    </div>
    <div className="vocab-count">Showing <strong>{shown.length}</strong> of <strong>{filtered.length}</strong> words <span>·</span> {learner.level} {LEVEL_NAMES[learner.level]}</div>
    {filtered.length?<><div className="vocab-grid">{shown.map((word,i)=>{
      const image=safeMediaUrl(word.imageUrl||word.imageAsset?.publicUrl);
      const mastered=!!learner.learned[word.id];
      return <article key={word.id} className="vocab-card"><div className="vocab-card-top"><span className="word-no">{String(i+1).padStart(2,'0')}</span><div className="vocab-card-actions"><button className={`icon-button ${mastered?'learned':''}`} onClick={()=>learner.toggleLearned(word.id)} aria-label={mastered?'Unmark word mastered':'Mark word mastered'} title={mastered?'Mastered':'Mark as mastered'}><Icon name={mastered?'check':'bookmark'} size={18}/></button><button className="icon-button" onClick={()=>speakGerman(word.german,word.audioUrl||word.audioAsset?.publicUrl)} aria-label={`Hear ${word.german}`}><Icon name="sound" size={19}/></button></div></div>
       {image&&<img className="vocab-illustration" loading="lazy" decoding="async" src={image} alt={word.german}/>}
       <div className="word-german">{word.article&&<span>{word.article} </span>}{word.german}</div><div className="word-english">{word.english}</div><div className="word-bangla">{word.bangla}</div>
       {word.exampleGerman&&<div className="word-example">“{word.exampleGerman}”</div>}<div className="vocab-card-footer"><span>{word.category?.name||cats.find(c=>c.id===word.categoryId)?.name||'Vocabulary'}</span><span>{mastered?<span className="mastered-tag">✓ Mastered</span>:word.difficulty||'EASY'}</span></div>
      </article>;
    })}</div>{shown.length<filtered.length&&<div className="load-more"><button className="button button-outlined" onClick={()=>setPage(p=>p+1)}>Load more words <Icon name="chevron" size={16}/></button></div>}</>:<Empty title="No words found" icon="vocab">Try a different search or category. Publish vocabulary in your CMS to populate this section.</Empty>}
  </Shell>;
}
