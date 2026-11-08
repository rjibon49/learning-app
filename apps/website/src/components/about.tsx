'use client';
import Link from 'next/link';
import {Shell,Heading} from './ui';
import {Icon} from './icon';
export function About(){
  return <Shell title="About Wortly"><Heading eyebrow="HELLO, NICE TO MEET YOU" title={<>Learning German, <em>made joyful.</em></>} desc="Wortly is a friendly learning experience built on top of your German-learning CMS and API."/>
    <div className="about-hero"><div><div className="eyebrow">OUR APPROACH</div><h2>Small lessons.<br/>Real confidence.</h2><p>Learn naturally with thoughtfully structured courses, clear vocabulary, helpful Bangla translations and practice that makes words stick.</p><Link href="/courses" className="button button-light">Explore courses <Icon name="arrow" size={18}/></Link></div><div className="about-art">Hallo<span>✳</span></div></div>
    <div className="about-grid"><div><Icon name="book" size={26}/><h3>Learn your way</h3><p>Structured A1–C1 courses and bite-sized lessons from your CMS.</p></div><div><Icon name="sound" size={26}/><h3>Speak out loud</h3><p>Listen to German words and practice your pronunciation using browser speech or attached audio.</p></div><div><Icon name="cards" size={26}/><h3>Make it stick</h3><p>Turn your vocabulary into flashcards and fun mini quizzes.</p></div></div>
    <div className="about-note"><Icon name="info" size={19}/><span>This website uses public CMS data when available, with sample content shown only when the backend is offline. Learner login, cloud progress sync, and subscriptions are not included because the supplied API does not expose a matching public learner flow.</span></div>
  </Shell>;
}
