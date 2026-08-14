import assert from 'node:assert/strict';
import test from 'node:test';
import {calculateCRMGoalProgress,normalizeCRMGoal} from '../apps/web/src/crm-goal';
import type {CRMLead} from '../apps/web/src/crm-leads';

const lead=(id:string,value:number,stage:CRMLead['stage'],updatedAt:string):CRMLead=>({id,name:id,contact:'Contato',value,stage,source:'Site',nextAction:'',color:'#6541ee',updatedAt});
const reference=new Date('2026-08-13T12:00:00-03:00');
const leads=[
 lead('ganho-1',12000,'Negócio fechado','2026-08-02T12:00:00-03:00'),
 lead('ganho-2',8000,'Negócio fechado','2026-08-10T12:00:00-03:00'),
 lead('ganho-antigo',9000,'Negócio fechado','2026-07-31T12:00:00-03:00'),
 lead('aberto',5000,'Em andamento','2026-08-11T12:00:00-03:00'),
];

test('calcula meta mensal por valor apenas com negócios fechados no mês',()=>{
 const result=calculateCRMGoalProgress({metric:'value',target:50000,updatedAt:''},leads,reference);
 assert.equal(result.achieved,20000);
 assert.equal(result.progress,40);
 assert.equal(result.remaining,30000);
 assert.equal(result.wonDeals,2);
});

test('calcula meta por quantidade e limita o velocímetro a 100%',()=>{
 const result=calculateCRMGoalProgress({metric:'quantity',target:1,updatedAt:''},leads,reference);
 assert.equal(result.achieved,2);
 assert.equal(result.progress,100);
 assert.equal(result.remaining,0);
});

test('normaliza uma configuração inválida sem produzir meta negativa',()=>{
 assert.deepEqual(normalizeCRMGoal({metric:'outro',target:-10}),{metric:'value',target:0,updatedAt:''});
});
