import assert from 'node:assert/strict';
import test from 'node:test';
import {draftLifetime,draftStorageKey,parseDrafts,serializeDrafts} from '../apps/web/src/save-drafts';

const change={key:'tasks',value:[{id:'1',title:'Pendente'}],baseValue:[],baseMissing:false};
test('rascunhos preservam o valor e a base original para detectar concorrência',()=>{
 assert.deepEqual(parseDrafts(serializeDrafts([change],1000),2000),[change]);
});
test('rascunhos expiram em sete dias e rejeitam dados inválidos',()=>{
 assert.deepEqual(parseDrafts(serializeDrafts([change],1000),1001+draftLifetime),[]);
 for(const raw of ['{quebrado','null','[]',JSON.stringify({version:2,savedAt:1000,entries:[change]})])assert.deepEqual(parseDrafts(raw,2000),[]);
 assert.deepEqual(parseDrafts(serializeDrafts([change],1000000),1000),[]);
});
test('ignora entradas inválidas e aceita uma coleção que ainda não existia',()=>{
 const fresh={key:'editorial_project-1',value:[],baseMissing:true};
 const raw=JSON.stringify({version:1,savedAt:1000,entries:[null,{}, {...change,key:'../tokens'},{...change,baseMissing:'false'},fresh]});
 assert.deepEqual(parseDrafts(raw,2000),[fresh]);
});
test('identifica rascunhos por API e UID sem incluir credenciais',()=>{
 assert.notEqual(draftStorageKey('/api','a'),draftStorageKey('/api','b'));
 assert.notEqual(draftStorageKey('/api','a'),draftStorageKey('https://other.test/api','a'));
});
