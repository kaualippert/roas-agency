import assert from 'node:assert/strict';
import test from 'node:test';
import {evaluateClientHealth,type ClientHealthData} from '../apps/web/src/client-health.js';
import type {Client,Task} from '../apps/web/src/types.js';

const client:Client={id:'client-1',companyName:'Exemplo',contactName:'Ana',email:'ana@example.com',phone:'',instagram:'',segment:'',city:'',status:'active',managerId:'member-1',monthlyRevenue:1500,serviceIds:['service-1'],startDate:'2026-09-01',notes:'',color:'#555',createdAt:'2026-09-01T12:00:00Z',updatedAt:'2026-09-01T12:00:00Z'};
const completeOnboarding={clientId:client.id,steps:Object.fromEntries(['contract','payment','accesses','briefing','strategy','project'].map(key=>[key,{completed:true}]))};
const base:ClientHealthData={today:'2026-09-28',tasks:[],projects:[],payments:[],reports:[],onboarding:[completeOnboarding],assignedMemberCount:1,serviceCount:1};
const task:Task={id:'task-1',title:'Revisar',description:'',clientId:client.id,projectId:'',responsibleId:'member-1',status:'pending',priority:'medium',dueDate:'2026-09-27',tags:[],position:0,commentsCount:0,attachmentsCount:0,createdAt:'2026-09-01T12:00:00Z',updatedAt:'2026-09-01T12:00:00Z'};

test('healthy client has no alerts',()=>{
 const result=evaluateClientHealth(client,base);
 assert.equal(result.level,'healthy');
 assert.equal(result.score,100);
 assert.deepEqual(result.signals,[]);
});

test('overdue task needs attention, completed task does not',()=>{
 const delayed=evaluateClientHealth(client,{...base,tasks:[task]});
 assert.equal(delayed.level,'attention');
 assert.match(delayed.signals[0].label,/tarefa atrasada/);
 assert.equal(evaluateClientHealth(client,{...base,tasks:[{...task,status:'completed'}]}).level,'healthy');
});

test('overdue payment is critical while payment due today is not',()=>{
 const result=evaluateClientHealth(client,{...base,payments:[{clientId:client.id,status:'pending',dueDate:'2026-09-27'}]});
 assert.equal(result.level,'critical');
 assert.equal(result.score,60);
 assert.equal(evaluateClientHealth(client,{...base,payments:[{clientId:client.id,status:'pending',dueDate:'2026-09-28'}]}).level,'healthy');
});

test('stale delivery and missing onboarding produce actionable signals',()=>{
 const result=evaluateClientHealth(client,{...base,onboarding:[],reports:[{id:'report-1',clientId:client.id,name:'Mensal',status:'Enviado',date:'2026-07-01',createdAt:'2026-07-01T12:00:00Z',updatedAt:'2026-07-01T12:00:00Z'}]});
 assert.equal(result.level,'attention');
 assert.deepEqual(result.signals.map(signal=>signal.area),['overview','reports']);
});

test('inactive clients are not counted as at risk',()=>{
 assert.deepEqual(evaluateClientHealth({...client,status:'inactive'},{...base,tasks:[task]}),{clientId:client.id,score:null,level:'inactive',signals:[]});
});
