import type {Metadata} from 'next';import {Courses} from '@/components/courses';
export const metadata:Metadata={title:'Courses'};
export default function Page(){return <Courses/>;}
