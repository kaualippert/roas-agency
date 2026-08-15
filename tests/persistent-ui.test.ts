import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizedKanbanDensity,readPersistentValue} from '../apps/web/src/persistent-ui';

test('normaliza a densidade persistida dos cards',()=>{
 assert.equal(normalizedKanbanDensity('compact'),'compact');
 assert.equal(normalizedKanbanDensity('invalid'),'comfortable');
 assert.equal(normalizedKanbanDensity(null),'comfortable');
});

test('recupera o último filtro salvo e usa fallback para dados inválidos',()=>{
 const previous=(globalThis as {localStorage?:unknown}).localStorage;
 (globalThis as {localStorage:unknown}).localStorage={getItem:(key:string)=>key==='period'?'"month"':'{inválido'};
 try{
  assert.equal(readPersistentValue('period','6m'),'month');
  assert.equal(readPersistentValue('broken','all'),'all');
 }finally{(globalThis as {localStorage?:unknown}).localStorage=previous}
});
