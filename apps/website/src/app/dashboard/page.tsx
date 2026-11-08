import type {Metadata} from 'next';
import {Overview} from '@/components/overview';
export const metadata:Metadata={title:'My dashboard'};
export default function DashboardPage(){return <Overview/>;}
