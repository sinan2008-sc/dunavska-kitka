import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {db} from '@/lib/data';
import {getAdminUser} from '@/lib/access-auth';
import {cookieToken,digest,equal,hashPassword,randomToken,verifyPassword} from '@/lib/password.mjs';
const fail=(error:string,status=403)=>NextResponse.json({error},{status});
export async function POST(r:NextRequest,{params}:any){
 if(r.headers.get('origin')!==new URL(r.url).origin)return fail('Нямате достъп.');
 const {action}=await params;const database=db();
 if(action==='logout'){const token=cookieToken(r.headers.get('cookie'));if(token)await database.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await digest(token)).run();const out=NextResponse.redirect(new URL('/admin',r.url),303);out.headers.set('Set-Cookie','__Host-dk_session=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0');return out;}
 if(!['login','setup','account'].includes(action))return fail('Not found',404);
 const body=await r.text();if(body.length>4096)return fail('Твърде дълга заявка.',413);let data:any;try{data=JSON.parse(body)}catch{return fail('Невалидни данни.',400)}
 const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return fail('Въведете валиден имейл.',400);
 if(action==='account'){
  if(!await getAdminUser())return fail('Нямате достъп.');
  let hash;try{hash=await hashPassword(data.password)}catch(e:any){return fail(e.message,400)}
  await database.batch([database.prepare('INSERT INTO admin_users(email,password_hash) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash').bind(email,hash),database.prepare('DELETE FROM admin_sessions WHERE email=?').bind(email)]);
  return NextResponse.json({ok:true});
 }
 const now=Date.now();await database.prepare('DELETE FROM admin_login_limits WHERE window<?').bind(now-86400000).run();const windowStart=Math.floor(now/900000)*900000;
 const keys=await Promise.all(['ip:'+r.headers.get('cf-connecting-ip'),'email:'+email].map(digest));
 const counts=await database.batch(keys.map(key=>database.prepare('INSERT INTO admin_login_limits(key,window,attempts) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window=excluded.window THEN attempts+1 ELSE 1 END,window=excluded.window RETURNING attempts').bind(key,windowStart)));
 if(counts.some((x:any)=>x.results[0].attempts>10))return fail('Твърде много опити. Опитайте след 15 минути.',429);
 let hash:string;
 if(action==='setup'){
  const secret=(env as any).ADMIN_SETUP_TOKEN;const owner=(env as any).ADMIN_OWNER_EMAIL?.trim().toLowerCase();
  if(!secret||secret.length<32||email!==owner||!equal(data.setupToken,secret))return fail('Невалидни данни за първоначална настройка.');
  try{hash=await hashPassword(data.password)}catch(e:any){return fail(e.message,400)}
  const inserted=await database.prepare('INSERT INTO admin_users(email,password_hash) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM admin_users) RETURNING email').bind(email,hash).all();
  if(!inserted.results.length)return fail('Първоначалната настройка вече е завършена.');
 }else{
  const user=await database.prepare('SELECT password_hash FROM admin_users WHERE email=?').bind(email).first();
  // Perform the same costly password derivation for unknown users.
  const candidate=user?.password_hash||'pbkdf2:100000:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000';
  if(!await verifyPassword(data.password,candidate)||!user)return fail('Невалиден имейл или парола.');hash=user.password_hash as string;
 }
 const token=randomToken();await database.batch([database.prepare('DELETE FROM admin_sessions WHERE expires<=?').bind(now),database.prepare('INSERT INTO admin_sessions(token_hash,email,password_hash,expires) VALUES(?,?,?,?)').bind(await digest(token),email,hash,now+43200000)]);
 const out=NextResponse.json({ok:true});out.headers.set('Cache-Control','no-store');out.headers.set('Set-Cookie',`__Host-dk_session=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=43200`);return out;
}
