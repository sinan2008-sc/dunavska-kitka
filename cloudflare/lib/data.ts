import { env } from "cloudflare:workers";
export function db(){const d=(env as any).DB;if(!d)throw new Error("Storage unavailable");return d;}
export {defaultGroups} from "./defaults";
export async function list(kind:string){const r=await db().prepare("SELECT id,data,created FROM records WHERE kind=? ORDER BY created DESC").bind(kind).all();return r.results.map((x:any)=>({...JSON.parse(x.data),id:x.id,created:x.created}));}
export async function put(kind:string,id:string,data:any){await db().prepare("INSERT INTO records(id,kind,data,created) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data WHERE records.kind=excluded.kind").bind(id,kind,JSON.stringify(data),new Date().toISOString()).run();}
