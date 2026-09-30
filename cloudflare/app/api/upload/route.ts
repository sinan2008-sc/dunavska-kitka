import {NextRequest,NextResponse} from 'next/server';
import {admin} from '../data/route';
import {bucket} from '@/lib/data';
export async function POST(r:NextRequest){
 if(r.headers.get('origin')!==new URL(r.url).origin||!await admin())return NextResponse.json({error:'Нямате достъп.'},{status:403});
 try{
  const length=Number(r.headers.get('content-length'));if(length>80*1024*1024)return NextResponse.json({error:'Максимален размер: 80 MB.'},{status:413});
  const f=(await r.formData()).get('file');const types=['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','image/webp'];
  if(!(f instanceof File)||!types.includes(f.type)||f.size>80*1024*1024)return NextResponse.json({error:'Изберете JPG, PNG, WebP или видео до 80 MB.'},{status:400});
  const id=crypto.randomUUID();await bucket().put(id,f.stream(),{httpMetadata:{contentType:f.type}});return NextResponse.json({url:'/api/media/'+id});
 }catch(e){console.error(e);return NextResponse.json({error:'Качването не успя.'},{status:503});}
}
