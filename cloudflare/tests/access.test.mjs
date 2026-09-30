import {test} from 'node:test';
import assert from 'node:assert/strict';
import gateway, {publicRequest} from '../public-worker.mjs';
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
