import type { Metadata, Viewport } from 'next';
import { LearnerProvider } from '@/components/learner-provider';
import './globals.css';

export const metadata:Metadata = {
  title:{default:'Wortly — Learn German a little every day',template:'%s · Wortly'},
  description:'Bite-sized German courses, Bangla and English translations, vocabulary, flashcards and practice from A1 to C1.',
  icons:{icon:'/favicon.svg'},
};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#f8f9f7'};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><LearnerProvider>{children}</LearnerProvider></body></html>;
}
