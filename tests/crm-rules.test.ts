import assert from 'node:assert/strict';
import test from 'node:test';
import {filterCRMLeads,moveCRMLeadToStage,type CRMLead} from '../apps/web/src/crm-leads';
import type {AgencyService} from '../apps/web/src/ServicesManager';

const now='2026-08-01T12:00:00.000Z';
const services:AgencyService[]=[{id:'service-monthly',name:'Social Media',description:'',price:2500,pricingType:'monthly',active:true,createdAt:now}];
const leads:CRMLead[]=[
 {id:'active',name:'Lead ativo',contact:'Ana',value:2500,stage:'Em andamento',source:'Instagram',nextAction:'Avançar',color:'#6541ee',serviceIds:['service-monthly']},
 {id:'won',name:'Lead ganho',contact:'Bia',value:2500,stage:'Negócio fechado',source:'Indicação',nextAction:'Cliente convertido',color:'#10a56b',convertedClientId:'client-1'},
];

test('filtros do CRM combinam situação, origem e serviço',()=>{
 const active=filterCRMLeads(leads,{status:'active',source:'Instagram',responsibleId:'',serviceId:'service-monthly'},services);
 assert.deepEqual(active.map(lead=>lead.id),['active']);
 const won=filterCRMLeads(leads,{status:'won',source:'',responsibleId:'',serviceId:''},services);
 assert.deepEqual(won.map(lead=>lead.id),['won']);
});

test('movimentação atualiza próxima ação e protege lead convertido',()=>{
 const moved=moveCRMLeadToStage(leads[0],'Reunião',false,now);
 assert.equal(moved.stage,'Reunião');
 assert.equal(moved.nextAction,'Realizar reunião comercial');
 assert.equal(moved.updatedAt,now);
 assert.equal(moveCRMLeadToStage(leads[1],'Em andamento',true,now),leads[1]);
});
