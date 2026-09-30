import {headers} from 'next/headers';
import {db} from './data';
import {cookieToken,digest} from './password.mjs';
export async function getAdminUser(){
 const token=cookieToken((await headers()).get('cookie'));
 if(!token||! /^[0-9a-f]{64}$/.test(token))return null;
 const row=await db().prepare('SELECT u.email FROM admin_sessions s JOIN admin_users u ON u.email=s.email WHERE s.token_hash=? AND s.expires>? AND s.password_hash=u.password_hash').bind(await digest(token),Date.now()).first();
 return row?{email:row.email,userId:await digest(row.email)}:null;
}
