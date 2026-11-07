import assert from 'node:assert/strict';
import test from 'node:test';
import {fetchMetaBreakdown,parseMetaBreakdown,resolveMetaBreakdownLink} from './marketing-oauth.js';
import type {AccessContext} from './access.js';

const query={clientId:'client-1',integrationId:'meta-1',dimension:'age',from:'2026-10-01',to:'2026-10-31'};
test('valida dimensões e datas fechadas antes de consultar a Meta',()=>{
 assert.deepEqual(parseMetaBreakdown(query),{clientId:'client-1',integrationId:'meta-1',dimension:'age',period:{from:query.from,to:query.to}});
 for(const bad of [{dimension:'__proto__'},{dimension:'age,region'},{from:'2026-02-30'},{to:'2026-09-30'},{clientId:''},{integrationId:null}])assert.throws(()=>parseMetaBreakdown({...query,...bad}),{status:400});
});

test('usa somente conta vinculada e respeita acesso do usuário ao cliente',()=>{
 const access:AccessContext={uid:'user-1',email:'user@example.test',member:null,isAdministrator:false,accessAreas:['marketing'],clientIds:new Set(['client-1'])};
 const link={id:'meta-1',clientId:'client-1',provider:'meta_ads',status:'connected',resourceId:'act_123',agencyConnectionId:'oauth-meta'};
 assert.deepEqual(resolveMetaBreakdownLink(access,[link],'client-1','meta-1'),{connectionId:'oauth-meta',resourceId:'act_123'});
 assert.throws(()=>resolveMetaBreakdownLink(access,[link],'client-2','meta-1'),{status:403});
 for(const bad of [{clientId:'client-2'},{provider:'google_ads'},{status:'error'},{resourceId:'bad'},{agencyConnectionId:''}])assert.throws(()=>resolveMetaBreakdownLink(access,[{...link,...bad}],'client-1','meta-1'),{status:404});
});

test('busca posicionamento com plataforma e pagina por cursor no domínio da Meta',async t=>{
 const requests:URL[]=[];
 t.mock.method(globalThis,'fetch',async(url:string,options:RequestInit)=>{
  requests.push(new URL(url));assert.deepEqual(options.headers,{authorization:'Bearer token-de-teste'});
  return Response.json(requests.length===1?{
   data:[{publisher_platform:'instagram',platform_position:'story',account_currency:'USD',spend:'20.40',reach:'190',impressions:'230',clicks:'0',actions:[{action_type:'lead',value:'2'}]}],
   paging:{next:'https://other.example/path',cursors:{after:'next-page'}},
  }:{data:[{publisher_platform:'facebook',platform_position:'feed',spend:'10'}]});
 });
 const result=await fetchMetaBreakdown('token-de-teste','act_123','placement',{from:query.from,to:query.to});
 assert.equal(requests.length,2);
 assert.ok(requests.every(url=>url.hostname==='graph.facebook.com'));
 assert.equal(requests[0].searchParams.get('breakdowns'),'publisher_platform,platform_position');
 assert.deepEqual(JSON.parse(requests[0].searchParams.get('time_range')!),{since:query.from,until:query.to});
 assert.equal(requests[1].searchParams.get('after'),'next-page');
 assert.equal(result.truncated,false);
 assert.deepEqual(result.rows[0].values,['instagram','story']);
 assert.equal(result.rows[0].currency,'USD');
 assert.equal(result.rows[0].leads,2);
 assert.equal(result.rows[0].clicks,0);
 assert.equal(result.rows[1].reach,null);
 assert.equal(result.rows[1].leads,null);
});

test('distingue consulta sem dados de falha do provedor',async t=>{
 const fetch=t.mock.method(globalThis,'fetch',async()=>Response.json({data:[]}));
 assert.deepEqual(await fetchMetaBreakdown('token-de-teste','123','region',{from:query.from,to:query.to}),{rows:[],truncated:false});
 fetch.mock.mockImplementation(async()=>Response.json({error:{message:'Permissão insuficiente'}},{status:403}));
 await assert.rejects(fetchMetaBreakdown('token-de-teste','123','gender',{from:query.from,to:query.to}),/Permissão insuficiente/);
});
