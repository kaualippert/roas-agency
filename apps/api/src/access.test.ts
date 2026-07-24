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
