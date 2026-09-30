import Club from '../club';
import {list} from '@/lib/data';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const pages=await list('page');if(!pages.some((p:any)=>p.slug===slug))notFound();return <Club page="custom" slug={slug}/>}
