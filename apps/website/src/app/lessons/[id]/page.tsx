import {LessonDetails} from '@/components/lessons';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <LessonDetails id={id}/>;}
