import type {Metadata} from 'next';
import {HomeLanding} from '@/components/home-landing';
import './home.css';

export const metadata:Metadata={
  title:'Wortly — Learn German, one small step at a time',
  description:'Learn German A1–C1 with guided courses, English and Bangla support, vocabulary, flashcards, mini quizzes and personal progress in your browser.',
};

export default function HomePage(){return <HomeLanding/>;}
