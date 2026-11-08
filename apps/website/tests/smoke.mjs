import assert from 'node:assert/strict';
import { demoApps, demoCourses, demoModules, demoLessons, demoCategories, demoVocabulary } from '../src/demo-data.js';

const app = { innerHTML: '' };
const listeners = {};
const storage = new Map();
const inputs = new Map();
globalThis.localStorage = { getItem(k) { return storage.get(k) || null; }, setItem(k, v) { storage.set(k, v); } };
globalThis.location = { pathname: '/' };
globalThis.history = { pushState(_s, _t, path) { location.pathname = path; } };
globalThis.window = { addEventListener(type, fn) { listeners[`window:${type}`]=fn; }, scrollTo() {}, speechSynthesis: { cancel(){}, speak(){} } };
globalThis.document = {
  getElementById(id) { return id==='app' ? app : inputs.get(id)||null; },
  addEventListener(type, fn) { listeners[type]=fn; },
  activeElement: { tagName:'BODY' },
  querySelector() { return null; },
};
globalThis.fetch = async url => {
  const u=new URL(String(url),'http://localhost:3000');
  const table={ '/api/apps':demoApps, '/api/courses':demoCourses, '/api/courses/modules':demoModules, '/api/courses/lessons':demoLessons, '/api/vocabulary/categories':demoCategories };
  const data=u.pathname==='/api/vocabulary' ? demoVocabulary.filter(w=>w.appId===u.searchParams.get('appId')) : table[u.pathname];
  return data ? {ok:true,status:200,json:async()=>data} : {ok:false,status:404,json:async()=>({message:'Not found'})};
};
function clickAction(action, params={}) {
  listeners.click({ target: { closest(selector) { return selector==='a[data-link]'?null:{ dataset:{ action, ...params }, getAttribute() { return null; } }; } }, stopPropagation() {}, preventDefault() {} });
}
function clickLink(path) {
  listeners.click({ target: { closest(selector) { return selector==='a[data-link]'?{ getAttribute:()=>path }:null; } }, preventDefault() {} });
}
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
await import('../src/main.js');
await sleep(80);
assert.match(app.innerHTML,/hero-card/, 'dashboard hero should render');
assert.doesNotMatch(app.innerHTML,/Preview mode/, 'live mock API should avoid preview banner');
assert.match(app.innerHTML,/Wunderbar/, 'dashboard content should render');
clickLink('/courses');
assert.match(app.innerHTML,/first German words/, 'course list should render');
clickLink('/courses/demo-c1');
assert.match(app.innerHTML,/Course curriculum/, 'course detail should render');
assert.match(app.innerHTML,/Hello, Germany!/, 'course modules should render');
clickLink('/lessons/demo-m1-l1');
assert.match(app.innerHTML,/Greetings that matter/, 'lesson detail should render');
clickAction('', {complete:'demo-m1-l1'});
assert.match(app.innerHTML,/Mark incomplete/, 'mark lesson complete should update');
assert.match(storage.get('wortly-learner-v1'),/demo-m1-l1/, 'lesson progress should persist');
clickLink('/vocabulary');
assert.match(app.innerHTML,/Words worth/, 'vocabulary page should render');
assert.match(app.innerHTML,/Kaffee/, 'vocabulary cards should render words');
clickAction('',{master:'demo-v1'});
assert.match(storage.get('wortly-learner-v1'),/demo-v1/, 'mastery should persist');
clickLink('/flashcards');
assert.match(app.innerHTML,/Tap to flip/, 'flashcard should render');
clickAction('flip-card');
assert.match(app.innerHTML,/THE MEANING/, 'flashcard should flip');
clickLink('/practice');
clickAction('quiz-start');
assert.match(app.innerHTML,/CHOOSE THE CORRECT ENGLISH MEANING/, 'quiz should begin');
clickAction('',{answer:'0'});
assert.match(app.innerHTML,/quiz-feedback/, 'answer feedback should render');
clickAction('quiz-next');
assert.match(app.innerHTML,/QUESTION 2 OF/, 'quiz should advance');
clickLink('/progress');
assert.match(app.innerHTML,/Collect little wins/, 'progress overview should render');
clickLink('/about');
assert.match(app.innerHTML,/Small lessons/, 'about should render');
console.log('PASS: API-bound dashboard, courses, module, lessons, completion, vocabulary, mastery, flashcards, quiz, progress, and about.');
