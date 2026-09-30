const enc=new TextEncoder();
export function hex(bytes){return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');}
export function randomToken(){return hex(crypto.getRandomValues(new Uint8Array(32)));}
export async function digest(s){return hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));}
export async function hashPassword(password,salt=hex(crypto.getRandomValues(new Uint8Array(16)))){
 if(typeof password!=='string'||password.length<12||password.length>256)throw Error('Паролата трябва да бъде между 12 и 256 знака.');
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 const hash=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256));
 return `pbkdf2:100000:${salt}:${hash}`;
}
export function equal(a,b){if(typeof a!=='string'||typeof b!=='string')return false;let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
export async function verifyPassword(password,stored){if(typeof stored!=='string'||!/^pbkdf2:100000:[0-9a-f]{32}:[0-9a-f]{64}$/.test(stored))return false;try{return equal(await hashPassword(password,stored.split(':')[2]),stored)}catch{return false}}
export function cookieToken(cookie){return cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-dk_session='))?.slice(18)||null;}
