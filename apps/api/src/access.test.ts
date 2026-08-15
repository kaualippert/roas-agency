import assert from 'node:assert/strict';
import test from 'node:test';
import {canAccessStateKey,filterStateValue,scopeStateWrite,type AccessContext} from './access.js';

const limited:AccessContext={
 uid:'firebase-1',
 email:'membro@agencia.com',
 member:null,
 isAdministrator:false,
 accessAreas:['general'],
 clientIds:new Set(['client-1']),
};

test('blocks state areas that were not granted',()=>{
 assert.equal(canAccessStateKey(limited,'tasks'),true);
 assert.equal(canAccessStateKey(limited,'crm_goal'),true);
 assert.equal(canAccessStateKey(limited,'client_processes'),true);
 assert.equal(canAccessStateKey(limited,'financial_entries'),false);
 assert.equal(canAccessStateKey(limited,'team',true),false);
});

test('filters records by assigned client',()=>{
 const value=filterStateValue(limited,'projects',[
  {id:'project-1',clientId:'client-1'},
  {id:'project-2',clientId:'client-2'},
 ]);
 assert.deepEqual(value,[{id:'project-1',clientId:'client-1'}]);
});

test('filters client processes by assigned client',()=>{
 const value=filterStateValue(limited,'client_processes',[
  {id:'process-1',clientId:'client-1'},
  {id:'process-2',clientId:'client-2'},
 ]);
 assert.deepEqual(value,[{id:'process-1',clientId:'client-1'}]);
});

test('filters brand integrations by the clients assigned to a marketing member',()=>{
 const marketingLimited:AccessContext={...limited,accessAreas:['marketing']};
 assert.equal(canAccessStateKey(marketingLimited,'clients'),true);
 assert.deepEqual(filterStateValue(marketingLimited,'clients',[{id:'client-1'},{id:'client-2'}]),[{id:'client-1'}]);
 const value=filterStateValue(marketingLimited,'client_marketing_integrations',[
  {id:'integration-1',clientId:'client-1',provider:'meta_ads'},
  {id:'integration-2',clientId:'client-2',provider:'google_ads'},
 ]);
 assert.deepEqual(value,[{id:'integration-1',clientId:'client-1',provider:'meta_ads'}]);
});

test('preserves hidden records when a limited member writes a collection',()=>{
 const current=[
  {id:'task-1',clientId:'client-1',title:'Antes'},
  {id:'task-2',clientId:'client-2',title:'Privada'},
 ];
 const incoming=[{id:'task-1',clientId:'client-1',title:'Depois'}];
 assert.deepEqual(scopeStateWrite(limited,'tasks',incoming,current),[
  {id:'task-2',clientId:'client-2',title:'Privada'},
  {id:'task-1',clientId:'client-1',title:'Depois'},
 ]);
});
