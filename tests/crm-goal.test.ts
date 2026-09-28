import assert from 'node:assert/strict';
import test from 'node:test';
import {calculateCRMGoalProgress,crmGoalCycleVersion,normalizeCRMGoal,resetCRMGoal} from '../apps/web/src/crm-goal';
import {moveCRMLeadToStage,type CRMLead} from '../apps/web/src/crm-leads';

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

test('redefine a meta, ignora negócios já contabilizados e abre um novo ciclo',()=>{
 const goal={metric:'value' as const,target:5000,updatedAt:'2026-08-01T10:00:00.000Z'};
 const reset=resetCRMGoal(goal,leads,reference);
 assert.deepEqual(reset.excludedWonLeadIds,['ganho-1','ganho-2']);
 assert.equal(crmGoalCycleVersion(reset),reference.toISOString());
 assert.equal(calculateCRMGoalProgress(reset,leads,reference).progress,0);
 const newWin=lead('ganho-3',5000,'Negócio fechado','2026-08-14T12:00:00-03:00');
 const result=calculateCRMGoalProgress(reset,[...leads,newWin],reference);
 assert.equal(result.achieved,5000);
 assert.equal(result.progress,100);
});

test('editar ou converter um negócio fechado não transfere o fechamento para outro mês',()=>{
 const closed=lead('ganho-agosto',3000,'Negócio fechado','2026-09-02T12:00:00-03:00');
 closed.wonAt='2026-08-25T12:00:00-03:00';
 const goal={metric:'value' as const,target:3000,updatedAt:''};
 assert.equal(calculateCRMGoalProgress(goal,[closed],reference).achieved,3000);
 assert.equal(calculateCRMGoalProgress(goal,[closed],new Date('2026-09-03T12:00:00-03:00')).achieved,0);
});

test('um negócio reaberto e fechado após redefinir a meta conta no novo ciclo',()=>{
 const goal={metric:'quantity' as const,target:1,updatedAt:'2026-08-01T10:00:00.000Z'};
 const reset=resetCRMGoal(goal,[leads[0]],reference);
 const reopened=moveCRMLeadToStage(leads[0],'Em andamento',false,'2026-08-13T13:00:00-03:00');
 const closedAgain=moveCRMLeadToStage(reopened,'Negócio fechado',false,'2026-08-14T13:00:00-03:00');
 assert.equal(calculateCRMGoalProgress(reset,[closedAgain],reference).achieved,1);
});

test('normaliza uma configuração inválida sem produzir meta negativa',()=>{
 assert.deepEqual(normalizeCRMGoal({metric:'outro',target:-10}),{metric:'value',target:0,updatedAt:''});
});
