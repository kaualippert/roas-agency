import assert from 'node:assert/strict';
import test from 'node:test';
import {auditVisibilityFilter,buildAuditEvents,redactAuditEvent} from './audit-history.js';
import type {AccessContext} from './access.js';

const administrator:AccessContext={uid:'admin-1',email:'admin@agency.test',member:{id:'member-1',email:'admin@agency.test',name:'Admin',status:'active'},isAdministrator:true,accessAreas:['general','marketing','finance','settings'],clientIds:null};

test('registra somente campos relevantes e mantém snapshots para comparar versões',()=>{
 const before=[{id:'client-1',companyName:'Loja Azul',email:'old@example.test',status:'active',updatedAt:'2026-01-01',color:'#fff'}];
 const after=[{id:'client-1',companyName:'Loja Azul',email:'new@example.test',status:'inactive',updatedAt:'2026-01-02',color:'#000'}];
 const [event]=buildAuditEvents('clients',before,after,administrator,'2026-02-01T10:00:00.000Z');
 assert.equal(event.action,'updated');
 assert.equal(event.actorName,'Admin');
 assert.deepEqual(event.changes.map(field=>field.key),['email','status']);
 assert.equal(event.before?.email,'old@example.test');
 assert.equal(event.after?.email,'new@example.test');
 assert.deepEqual(event.areas,['general','marketing','finance']);
});

test('registra criação e exclusão como versões distintas',()=>{
 const task={id:'task-1',title:'Enviar relatório',description:'Conteúdo importante',status:'todo',priority:'high',dueDate:'2026-02-10',updatedAt:'2026-02-01'};
 const [created]=buildAuditEvents('tasks',[],[task],administrator);
 const [deleted]=buildAuditEvents('tasks',[task],[],administrator);
 assert.equal(created.action,'created');
 assert.equal(created.before,null);
 assert.equal(created.after?.title,'Enviar relatório');
 assert.equal(deleted.action,'deleted');
 assert.equal(deleted.before?.description,'Conteúdo importante');
 assert.equal(deleted.after,null);
});

test('identifica o sistema nas atualizações automáticas de atraso',()=>{
 const before=[{id:'task-late',title:'Tarefa',status:'todo',dueDate:'2026-01-01'}];
 const after=[{...before[0],status:'overdue'}];
 const [event]=buildAuditEvents('tasks',before,after,administrator);
 assert.equal(event.actorId,'system');
 assert.equal(event.actorName,'Sistema');
});

test('registra mudanças em áreas e clientes permitidos da equipe sem dados de autenticação',()=>{
 const before=[{id:'member-2',name:'Bia',email:'bia@agency.test',firebaseUid:'secret',status:'active',accessAreas:['general'],clientIds:['client-a']}];
 const after=[{...before[0],accessAreas:['general','finance'],clientIds:['client-a','client-b']}];
 const [event]=buildAuditEvents('team',before,after,administrator);
 assert.deepEqual(event.changes.map(field=>field.key),['accessAreas','clientIds']);
 assert.equal('firebaseUid' in (event.before||{}),false);
 assert.deepEqual(event.clientIds,['client-a','client-b']);
});

test('restringe leitura do histórico por área e cliente atribuído',()=>{
 const limited:AccessContext={...administrator,isAdministrator:false,accessAreas:['finance'],clientIds:new Set(['client-a'])};
 const filter=auditVisibilityFilter(limited);
 assert.deepEqual(filter.areas,{$in:['finance']});
 assert.deepEqual(filter.$or,[
  {clientId:{$in:['client-a']}},
  {clientIds:{$in:['client-a']}},
  {clientId:{$exists:false},clientIds:{$exists:false}},
 ]);
});

test('remove IDs de clientes fora do escopo dos snapshots de permissões',()=>{
 const limited:AccessContext={...administrator,isAdministrator:false,accessAreas:['settings'],clientIds:new Set(['client-a'])};
 const [event]=buildAuditEvents('team',[
  {id:'member-3',name:'Leo',email:'leo@example.test',clientIds:['client-a']},
 ],[
  {id:'member-3',name:'Leo',email:'leo@example.test',clientIds:['client-a','client-secret']},
 ],administrator);
 const safe=redactAuditEvent(event,limited);
 assert.deepEqual(safe.clientIds,['client-a']);
 assert.deepEqual(safe.after?.clientIds,['client-a']);
 assert.deepEqual(safe.changes.find(change=>change.key==='clientIds')?.after,['client-a']);
});
