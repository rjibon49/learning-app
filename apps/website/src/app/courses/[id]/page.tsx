import {CourseDetails} from '@/components/courses';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <CourseDetails id={id}/>;}
