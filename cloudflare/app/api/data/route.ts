import { NextRequest, NextResponse } from "next/server";
import {env} from "cloudflare:workers";
import {getAdminUser} from "@/lib/access-auth";
import {db,list,put,defaultGroups} from "@/lib/data";
import {defaultSite} from "@/lib/defaults";

export const dynamic="force-dynamic";
export async function admin(){return !!await getAdminUser();}
async function handleGet(){try{const isAdmin=await admin();const [groups,lessons,notices,polls,club,site,pages]=await Promise.all([list("group"),list("lesson"),list("notice"),list("poll"),list("club"),list("site"),list("page")]);const merged=[...defaultGroups.filter(g=>!groups.some((r:any)=>r.id===g.id)),...groups].filter((g:any)=>!g.hidden);const out:any={groups:merged,lessons,notices,polls:polls.filter((p:any)=>isAdmin||p.active),club:club[0]||null,site:{...defaultSite,...(site[0]||{})},pages,isAdmin};if(isAdmin){out.registrations=await list("registration");out.results=(await db().prepare("SELECT poll_id,answer,COUNT(*) AS count FROM votes GROUP BY poll_id,answer").all()).results;}return NextResponse.json(out);}catch(e){console.error(e);return NextResponse.json({error:"Данните не могат да бъдат заредени. Опитайте отново."},{status:503});}}
async function handlePost(req:NextRequest){try{const origin=req.headers.get("origin");const own=new URL(req.url).origin;const external=(env as any).PUBLIC_SITE_ORIGIN;if(origin!==own&&origin!==external)return NextResponse.json({error:"Невалидна заявка"},{status:403});const b:any=await req.json();const fail=(s:string)=>NextResponse.json({error:s},{status:400});if(b.action==="register"){const d=b.data;if(!d||typeof d.name!=="string"||d.name.trim().length<2||d.name.length>150||!/^\S+@\S+\.\S+$/.test(d.email)||String(d.phone).length<6||!d.consent)return fail("Попълнете името, телефона, имейла и съгласието.");const gs=await list("group");if(![...defaultGroups.filter(g=>!gs.some((r:any)=>r.id===g.id)),...gs].some((g:any)=>g.id===d.group&&!g.hidden))return fail("Изберете валидна група.");await put("registration",crypto.randomUUID(),{name:d.name.trim(),email:d.email.slice(0,200),phone:String(d.phone).slice(0,40),group:d.group,note:String(d.note||"").slice(0,2000),status:"Нова"});return NextResponse.json({ok:true});}
if(b.action==="vote"){const ps=await list("poll");const p=ps.find((p:any)=>p.id===b.id);if(!p?.active||!Number.isInteger(b.answer)||b.answer<0||b.answer>=p.options.length)return fail("Анкетата не е активна или отговорът е невалиден.");const u=await getAdminUser();let voter=u?.userId||(typeof b.voter==="string"&&/^[0-9a-f-]{36}$/i.test(b.voter)?b.voter:null)||req.cookies.get("dk_voter")?.value||crypto.randomUUID();await db().prepare("INSERT INTO votes(id,poll_id,voter,answer) VALUES(?,?,?,?) ON CONFLICT(poll_id,voter) DO UPDATE SET answer=excluded.answer").bind(crypto.randomUUID(),b.id,voter,b.answer).run();const res=NextResponse.json({ok:true});res.cookies.set("dk_voter",voter,{httpOnly:true,secure:true,sameSite:"lax",maxAge:31536000,path:"/"});return res;}
if(origin!==own||!await admin())return NextResponse.json({error:"Необходим е администраторски достъп."},{status:403});
if(b.kind==="group"&&b.action==="delete"){const gs=await list("group");const current=[...defaultGroups.filter(g=>!gs.some((r:any)=>r.id===g.id)),...gs].filter((g:any)=>!g.hidden);if(current.length<=1)return fail("Трябва да остане поне една група.");const existing=current.find((g:any)=>g.id===b.id);if(!existing)return fail("Групата не е намерена.");if(defaultGroups.some(g=>g.id===b.id)){await put("group",b.id,{...existing,hidden:true});return NextResponse.json({ok:true});}}
if(b.action==="delete"&&["notice","lesson","poll","group","registration","page"].includes(b.kind)){await db().prepare("DELETE FROM records WHERE id=? AND kind=?").bind(b.id,b.kind).run();return NextResponse.json({ok:true});}
if(b.action==="save"&&["notice","lesson","poll","group","club","registration","site","page"].includes(b.kind)){const d=b.data;if(!d||JSON.stringify(d).length>15000)return fail("Невалидни данни.");if(b.kind==="poll"&&(!Array.isArray(d.options)||d.options.length<2||d.options.length>12||d.options.some((x:any)=>typeof x!=="string"||!x.trim())))return fail("Добавете между 2 и 12 отговора.");if(b.kind==="lesson"&&!/^\/api\/media\/[a-zA-Z0-9-]+$/.test(d.url||"")){try{const u=new URL(d.url);if(u.protocol!=="https:")return fail("Използвайте HTTPS видео адрес.");}catch{return fail("Добавете валиден видео адрес.");}}if(b.kind==="page"){const slug=String(d.slug||"");if(!/^[a-z][a-z0-9-]{1,39}$/.test(slug)||["admin","api","about","groups","lessons","rehearsals","polls","join"].includes(slug))return fail("Изберете друг кратък адрес с латински букви.");if(!d.title||String(d.title).length>180)return fail("Добавете заглавие до 180 знака.");const other=(await list("page")).find((p:any)=>p.slug===slug&&p.id!==b.id);if(other)return fail("Този адрес вече се използва.");}if(b.kind==="group"&&(!d.name||!/^#[0-9a-fA-F]{6}$/.test(d.color||"")))return fail("Добавете име и цвят на групата.");const id=b.kind==="club"?"club":b.kind==="site"?"site":b.id||crypto.randomUUID();await put(b.kind,id,d);return NextResponse.json({ok:true,id});}return fail("Невалидна операция.");}catch(e){console.error(e);return NextResponse.json({error:"Записът не беше успешен. Опитайте отново."},{status:503});}}

// Only the configured GitHub Pages origin may read data or submit public forms.
function cors(req:NextRequest,res:NextResponse){
  const origin=req.headers.get('origin');
  if(origin && origin===(env as any).PUBLIC_SITE_ORIGIN){
    res.headers.set('Access-Control-Allow-Origin',origin);
    res.headers.set('Vary','Origin');
    res.headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers','Content-Type');
  }
  return res;
}
export async function GET(req:NextRequest){return cors(req,await handleGet())}
export async function POST(req:NextRequest){return cors(req,await handlePost(req))}
export async function OPTIONS(req:NextRequest){
  if(req.headers.get('origin')!==(env as any).PUBLIC_SITE_ORIGIN)return new Response(null,{status:403});
  return cors(req,new NextResponse(null,{status:204}));
}
