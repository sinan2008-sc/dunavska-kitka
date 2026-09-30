import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAccessToken} from '../lib/access-token.mjs';
import gateway, {publicRequest} from '../public-worker.mjs';

const keys = await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk = {...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'test-key'};
const config = {ACCESS_TEAM_DOMAIN:'test-team.cloudflareaccess.com',ACCESS_AUD:'our-admin-app',ADMIN_EMAILS:'owner@example.com,second@example.com'};
const b64 = value => Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
const claims = {iss:'https://'+config.ACCESS_TEAM_DOMAIN,aud:[config.ACCESS_AUD],exp:Math.floor(Date.now()/1000)+600,sub:'verified-user',email:'owner@example.com'};
async function token(overrides={},headerOverrides={}) {
 const body=b64({alg:'RS256',kid:'test-key',...headerOverrides})+'.'+b64({...claims,...overrides});
 return body+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(body))).toString('base64url');
}
const fetcher=async()=>Response.json({keys:[jwk]});
test('both allowed administrators require a valid signed identity',async()=>{
 assert.equal((await validateAccessToken(await token(),config,fetcher)).email,'owner@example.com');
 assert.equal((await validateAccessToken(await token({email:'SECOND@example.com'}),config,fetcher)).email,'second@example.com');
});
test('reject expired, wrong audience, wrong issuer and unauthorized identity',async()=>{
 for (const input of [{exp:0},{aud:['other-app']},{iss:'https://evil.example'},{email:'stranger@example.com'},{sub:''},{nbf:Math.floor(Date.now()/1000)+3600}]) assert.equal(await validateAccessToken(await token(input),config,fetcher),null);
});
test('reject algorithm confusion, altered signature and missing configuration',async()=>{
 assert.equal(await validateAccessToken(await token({}, {alg:'HS256'}),config,fetcher),null);
 const signed=await token(); const [h,p,s]=signed.split('.');
 assert.equal(await validateAccessToken(h+'.'+b64({...claims,email:'second@example.com'})+'.'+s,config,fetcher),null);
 assert.equal(await validateAccessToken(signed,{...config,ADMIN_EMAILS:''},fetcher),null);
 assert.equal(await validateAccessToken(signed,{...config,ACCESS_AUD:''},fetcher),null);
});
test('public service binding strips all asserted identities and credentials',()=>{
 const r=publicRequest(new Request('https://public.example/api/data',{headers:{'Cf-Access-Jwt-Assertion':'forged',Authorization:'Bearer token',Cookie:'CF_Authorization=token','oai-authenticated-user-email':'owner@example.com',Origin:'https://sinan2008-sc.github.io'}}));
 assert.equal(r.headers.get('Cf-Access-Jwt-Assertion'),null);assert.equal(r.headers.get('authorization'),null);assert.equal(r.headers.get('cookie'),null);assert.equal(r.headers.get('oai-authenticated-user-email'),null);assert.equal(r.headers.get('origin'),'https://sinan2008-sc.github.io');
});
test('public gateway blocks admin writes and uploads before forwarding',async()=>{
 let calls=0;const env={SERVER:{fetch:async()=>{calls++;return Response.json({ok:true})}}};
 for (const action of ['save','delete','unknown']) assert.equal((await gateway.fetch(new Request('https://public.example/api/data',{method:'POST',body:JSON.stringify({action})}),env)).status,403);
 assert.equal((await gateway.fetch(new Request('https://public.example/api/upload',{method:'POST'}),env)).status,404);assert.equal(calls,0);
 assert.equal((await gateway.fetch(new Request('https://public.example/api/data',{method:'POST',body:JSON.stringify({action:'register'})}),env)).status,200);assert.equal(calls,1);
});
